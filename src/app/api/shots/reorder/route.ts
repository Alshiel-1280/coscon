import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { reorderShotsSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedContext();
    const raw = await request.json();
    const parsed = reorderShotsSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    for (const item of parsed.data.items) {
      const updatePayload: Record<string, unknown> = {
        sort_order: item.sortOrder,
      };
      if (item.sceneId) {
        updatePayload.scene_id = item.sceneId;
      }

      const { error } = await supabase
        .from("shots")
        .update(updatePayload)
        .eq("id", item.id);
      if (error) {
        return fail(error.message, 400);
      }
    }

    return ok({ updated: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
