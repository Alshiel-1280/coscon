import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const { supabase } = await getAuthenticatedContext();
    const { data, error } = await supabase
      .from("deliverables")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") {
        return ok([]);
      }
      return fail(error.message, 400);
    }
    return ok(data ?? []);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
