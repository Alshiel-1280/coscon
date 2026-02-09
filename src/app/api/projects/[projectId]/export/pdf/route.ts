import { getAuthenticatedContext } from "@/lib/auth";
import { ensureProjectSubfolder, uploadFileToDrive } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { buildProjectSummaryPdf } from "@/lib/pdf";
import { exportProjectPdfSchema } from "@/lib/validators";

type CommentRow = {
  body: string;
  created_at: string;
  user_id: string;
};

function fileName(projectTitle: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safe = projectTitle.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  return `${safe || "project"}_storyboard_${stamp}.pdf`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const { supabase, user, googleAccessToken } = await getAuthenticatedContext();
    if (!googleAccessToken) {
      return fail(
        "Google Drive access token is missing. Please sign out and sign in again.",
        401,
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = exportProjectPdfSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,title,status,shoot_date,location,drive_folder_id")
      .eq("id", projectId)
      .single();
    if (projectError) {
      return fail(projectError.message, 404);
    }

    const [{ data: scenes, error: sceneError }, { data: shots, error: shotError }] =
      await Promise.all([
        supabase
          .from("scenes")
          .select("id,title,sort_order")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("shots")
          .select("id,scene_id,title,status,composition_memo,sort_order")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
    if (sceneError) {
      return fail(sceneError.message, 400);
    }
    if (shotError) {
      return fail(shotError.message, 400);
    }

    let commentData: CommentRow[] = [];
    if (parsed.data.includeComments) {
      const { data: comments, error: commentError } = await supabase
        .from("comments")
        .select("body,created_at,user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (commentError) {
        return fail(commentError.message, 400);
      }
      commentData = (comments ?? []) as CommentRow[];
    }

    const sceneRows = (scenes ?? []).map((scene) => ({
      ...scene,
      shots: (shots ?? [])
        .filter((shot) => shot.scene_id === scene.id)
        .map((shot) => ({
          id: shot.id,
          title: shot.title,
          status: shot.status,
          composition_memo: shot.composition_memo,
          sort_order: shot.sort_order,
        })),
    }));

    const pdfBytes = await buildProjectSummaryPdf({
      project: {
        title: project.title,
        shootDate: project.shoot_date,
        location: project.location,
        status: project.status,
      },
      scenes: sceneRows,
      comments: commentData.map((item) => ({
        body: item.body,
        created_at: item.created_at,
        user_name: item.user_id,
      })),
    });

    const exportFolder = await ensureProjectSubfolder({
      accessToken: googleAccessToken,
      projectFolderId: project.drive_folder_id,
      subfolder: "exports",
    });

    const uploaded = await uploadFileToDrive({
      accessToken: googleAccessToken,
      parentFolderId: exportFolder.id,
      fileName: fileName(project.title),
      mimeType: "application/pdf",
      buffer: Buffer.from(pdfBytes),
    });

    const { data: deliverable, error: deliverableError } = await supabase
      .from("deliverables")
      .insert({
        project_id: projectId,
        kind: "pdf",
        drive_file_id: uploaded.id,
        drive_file_name: uploaded.name,
        drive_web_view_link: uploaded.webViewLink,
        mime_type: "application/pdf",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (deliverableError) {
      if (deliverableError.code === "42P01") {
        return fail(
          "deliverablesテーブルが未作成です。docs/supabase_schema.sqlを再適用してください。",
          400,
        );
      }
      return fail(deliverableError.message, 400);
    }

    return ok(deliverable, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
