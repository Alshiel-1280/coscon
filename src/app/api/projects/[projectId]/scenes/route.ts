import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { createSceneSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return fail(error.message, 400);
    }
    return ok(data ?? []);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const raw = await request.json();
    const parsed = createSceneSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data: sceneForOrder } = await supabase
      .from("scenes")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (sceneForOrder?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("scenes")
      .insert({
        project_id: projectId,
        title: parsed.data.title,
        sort_order: nextOrder,
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
