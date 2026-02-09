import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

type Row = {
  project_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  profiles:
    | {
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const { supabase } = await getAuthenticatedContext();

    const { data, error } = await supabase
      .from("project_members")
      .select(
        "project_id,user_id,role,created_at,profiles:user_id(id,email,display_name,avatar_url)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      return fail(error.message, 400);
    }

    const members = ((data ?? []) as Row[]).map((row) => ({
      project_id: row.project_id,
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
      profile: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
    }));

    return ok(members);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
