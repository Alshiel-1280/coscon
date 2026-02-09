import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) {
      return fail(projectError.message, 404);
    }

    const [{ data: scenes, error: scenesError }, { data: shots, error: shotsError }] =
      await Promise.all([
        supabase
          .from("scenes")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("shots")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (scenesError) {
      return fail(scenesError.message, 400);
    }
    if (shotsError) {
      return fail(shotsError.message, 400);
    }

    const sceneList = (scenes ?? []).map((scene) => ({
      ...scene,
      shots: (shots ?? []).filter((shot) => shot.scene_id === scene.id),
    }));

    return ok({
      project,
      scenes: sceneList,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
