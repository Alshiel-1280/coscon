import { z } from "zod";
import { getAuthenticatedContext } from "@/lib/auth";
import { ensureProjectSubfolder, uploadFileToDrive } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

const exportSchema = z.object({
  pngDataUrl: z.string().startsWith("data:image/png;base64,"),
  fileName: z.string().trim().min(1).max(120).optional(),
});

function toBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

function buildFileName(name?: string): string {
  if (!name) {
    return `lighting_${Date.now()}.png`;
  }
  return `${name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 100)}.png`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase, user, googleAccessToken } = await getAuthenticatedContext();
    if (!googleAccessToken) {
      return fail(
        "Google Drive access token is missing. Please sign out and sign in again.",
        401,
      );
    }

    const raw = await request.json();
    const parsed = exportSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data: shot, error: shotError } = await supabase
      .from("shots")
      .select("id,project_id,title")
      .eq("id", shotId)
      .single();
    if (shotError) {
      return fail(shotError.message, 404);
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,drive_folder_id")
      .eq("id", shot.project_id)
      .single();
    if (projectError) {
      return fail(projectError.message, 404);
    }

    const folder = await ensureProjectSubfolder({
      accessToken: googleAccessToken,
      projectFolderId: project.drive_folder_id,
      subfolder: "diagrams",
    });

    const uploaded = await uploadFileToDrive({
      accessToken: googleAccessToken,
      parentFolderId: folder.id,
      fileName: buildFileName(parsed.data.fileName),
      mimeType: "image/png",
      buffer: toBuffer(parsed.data.pngDataUrl),
    });

    const { data: asset, error: assetError } = await supabase
      .from("shot_assets")
      .insert({
        shot_id: shotId,
        kind: "diagram_preview",
        drive_file_id: uploaded.id,
        drive_file_name: uploaded.name,
        drive_web_view_link: uploaded.webViewLink,
        mime_type: "image/png",
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        size_bytes: uploaded.sizeBytes ?? null,
        uploaded_by: user.id,
      })
      .select("*")
      .single();
    if (assetError) {
      return fail(assetError.message, 400);
    }

    await supabase
      .from("lighting_diagrams")
      .upsert(
        {
          shot_id: shotId,
          updated_by: user.id,
          preview_asset_id: asset.id,
          diagram_json: {},
        },
        { onConflict: "shot_id" },
      )
      .select("id")
      .single();

    return ok(asset, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
