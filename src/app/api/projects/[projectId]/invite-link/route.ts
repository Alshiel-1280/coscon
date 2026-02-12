import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { ensureDriveFolderSharedByLink } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

const INVITE_LINK_WARNING =
  "このリンクを知っている人は誰でもプロジェクトに参加し、Driveフォルダを編集できます。再発行すると旧リンクは無効になります。";

function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await readParams(context.params);
    const { supabase, user, googleAccessToken } = await getAuthenticatedContext();
    if (!googleAccessToken) {
      return fail(
        "Google Drive access token is missing. Please sign out and sign in again.",
        401,
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,title,owner_user_id,drive_folder_id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) {
      return fail(projectError.message, 400);
    }
    if (!project) {
      return fail("Project not found.", 404);
    }
    if (project.owner_user_id !== user.id) {
      return fail("Only owner can generate invite links.", 403);
    }

    const permission = await ensureDriveFolderSharedByLink({
      accessToken: googleAccessToken,
      folderId: project.drive_folder_id,
      role: "writer",
    });

    const token = crypto.randomBytes(24).toString("base64url");
    const tokenHash = hashInviteToken(token);
    const { error: upsertError } = await supabase.from("project_invite_links").upsert(
      {
        project_id: projectId,
        token_hash: tokenHash,
        created_by: user.id,
        drive_permission_id: permission.permissionId,
        is_active: true,
      },
      {
        onConflict: "project_id",
      },
    );
    if (upsertError) {
      return fail(upsertError.message, 400);
    }

    const inviteUrl = new URL(`/invite/${token}`, request.nextUrl.origin).toString();
    return ok({
      projectId,
      inviteUrl,
      warning: INVITE_LINK_WARNING,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
