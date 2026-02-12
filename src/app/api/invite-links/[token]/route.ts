import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type InvitePreviewRow = {
  project_id: string;
  project_title: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await readParams(context.params);
    if (!token || !token.trim()) {
      return fail("Invite token is required.", 400);
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("preview_project_invite_link", {
      _token: token,
    });
    if (error) {
      return fail(error.message, 400);
    }

    const row = Array.isArray(data)
      ? ((data[0] as InvitePreviewRow | undefined) ?? null)
      : null;
    if (!row?.project_id) {
      return fail("招待リンクが無効です。", 404);
    }

    return ok({
      projectId: row.project_id,
      projectTitle: row.project_title,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
