import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

type AcceptInviteRow = {
  project_id: string;
  project_title: string;
  already_member: boolean;
};

function isInvalidInviteError(error: { code?: string; message?: string }): boolean {
  if (error.code === "P0002") {
    return true;
  }
  const message = (error.message ?? "").toLowerCase();
  return message.includes("invalid") || message.includes("inactive");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await readParams(context.params);
    if (!token || !token.trim()) {
      return fail("Invite token is required.", 400);
    }

    const { supabase } = await getAuthenticatedContext();
    const { data, error } = await supabase.rpc("accept_project_invite_link", {
      _token: token,
    });

    if (error) {
      if (isInvalidInviteError(error)) {
        return fail("招待リンクが無効です。", 404);
      }
      if (error.code === "42501") {
        return fail("Unauthorized", 401);
      }
      return fail(error.message, 400);
    }

    const row = Array.isArray(data)
      ? ((data[0] as AcceptInviteRow | undefined) ?? null)
      : null;
    if (!row?.project_id) {
      return fail("招待リンクが無効です。", 404);
    }

    return ok({
      projectId: row.project_id,
      projectTitle: row.project_title,
      alreadyMember: row.already_member,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message.toLowerCase().includes("auth session missing"))
    ) {
      return fail("Unauthorized", 401);
    }
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
