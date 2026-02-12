import type { DrivePermissionRole } from "@/lib/drive";
import { shareDriveFolderWithUser } from "@/lib/drive";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { inviteMemberSchema } from "@/lib/validators";

const INVITE_MEMBER_ROLE = "editor" as const;
const DRIVE_INVITE_ROLE: DrivePermissionRole = "writer";

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

    const raw = await request.json();
    const parsed = inviteMemberSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data: inviterMember, error: inviterError } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (inviterError) {
      return fail(inviterError.message, 400);
    }
    if (!inviterMember || inviterMember.role !== "owner") {
      return fail("Only owner can invite members.", 403);
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,drive_folder_id")
      .eq("id", projectId)
      .single();
    if (projectError) {
      return fail(projectError.message, 404);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,display_name,avatar_url")
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (profileError) {
      return fail(profileError.message, 400);
    }
    if (!profile) {
      return fail(
        "招待先ユーザーはまだアプリ未登録です。先に一度ログインしてもらってください。",
        404,
      );
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("project_members")
      .upsert(
        {
          project_id: projectId,
          user_id: profile.id,
          role: INVITE_MEMBER_ROLE,
          added_by: user.id,
        },
        {
          onConflict: "project_id,user_id",
        },
      )
      .select("project_id,user_id,role,created_at")
      .single();

    if (upsertError) {
      return fail(upsertError.message, 400);
    }

    await shareDriveFolderWithUser({
      accessToken: googleAccessToken,
      folderId: project.drive_folder_id,
      email: profile.email,
      role: DRIVE_INVITE_ROLE,
    });

    return ok(
      {
        ...upserted,
        profile,
      },
      { status: 201 },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
