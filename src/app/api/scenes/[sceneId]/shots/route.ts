import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { createShotSchema } from "@/lib/validators";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sceneId: string }> },
) {
  try {
    const { sceneId } = await readParams(context.params);
    const { supabase, user } = await getAuthenticatedContext();

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id,project_id")
      .eq("id", sceneId)
      .single();

    if (sceneError) {
      return fail(sceneError.message, 404);
    }

    const raw = await request.json();
    const parsed = createShotSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data: shotForOrder } = await supabase
      .from("shots")
      .select("sort_order")
      .eq("scene_id", sceneId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (shotForOrder?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("shots")
      .insert({
        scene_id: sceneId,
        project_id: scene.project_id,
        title: parsed.data.title,
        status: parsed.data.status,
        composition_memo: parsed.data.compositionMemo ?? null,
        sort_order: nextOrder,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return fail(error.message, 400);
    }
    return ok(data, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
