import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { updateSceneSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sceneId: string }> },
) {
  try {
    const { sceneId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();
    const raw = await request.json();
    const parsed = updateSceneSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("scenes")
      .update({
        title: parsed.data.title,
        sort_order: parsed.data.sortOrder,
      })
      .eq("id", sceneId)
      .select("*")
      .single();

    if (error) {
      return fail(error.message, 400);
    }
    return ok(data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sceneId: string }> },
) {
  try {
    const { sceneId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();
    const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
    if (error) {
      return fail(error.message, 400);
    }
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
