import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { updateShotSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const { data: shot, error: shotError } = await supabase
      .from("shots")
      .select("*")
      .eq("id", shotId)
      .single();

    if (shotError) {
      return fail(shotError.message, 404);
    }

    const [
      { data: assets, error: assetsError },
      { data: lighting, error: lightingError },
    ] = await Promise.all([
      supabase
        .from("shot_assets")
        .select("*")
        .eq("shot_id", shotId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lighting_diagrams")
        .select("*")
        .eq("shot_id", shotId)
        .maybeSingle(),
    ]);

    if (assetsError) {
      return fail(assetsError.message, 400);
    }
    if (lightingError) {
      return fail(lightingError.message, 400);
    }

    return ok({
      shot,
      assets: assets ?? [],
      lighting: lighting ?? null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();
    const raw = await request.json();
    const parsed = updateShotSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) payload.title = parsed.data.title;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.compositionMemo !== undefined) {
      payload.composition_memo = parsed.data.compositionMemo;
    }
    if (parsed.data.sortOrder !== undefined) {
      payload.sort_order = parsed.data.sortOrder;
    }
    if (parsed.data.sceneId !== undefined) {
      payload.scene_id = parsed.data.sceneId;
    }

    const { data, error } = await supabase
      .from("shots")
      .update(payload)
      .eq("id", shotId)
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
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();
    const { error } = await supabase.from("shots").delete().eq("id", shotId);
    if (error) {
      return fail(error.message, 400);
    }
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
