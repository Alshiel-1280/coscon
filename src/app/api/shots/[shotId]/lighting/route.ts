import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { lightingDiagramSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();
    const { data, error } = await supabase
      .from("lighting_diagrams")
      .select("*")
      .eq("shot_id", shotId)
      .maybeSingle();

    if (error) {
      return fail(error.message, 400);
    }
    return ok(data ?? null);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase, user } = await getAuthenticatedContext();
    const raw = await request.json();
    const parsed = lightingDiagramSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("lighting_diagrams")
      .upsert(
        {
          shot_id: shotId,
          diagram_json: parsed.data.diagramJson,
          updated_by: user.id,
        },
        {
          onConflict: "shot_id",
        },
      )
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
