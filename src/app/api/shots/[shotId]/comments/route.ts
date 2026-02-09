import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";
import { commentSchema } from "@/lib/validators";

type BasicComment = {
  id: string;
  project_id: string | null;
  shot_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const { data: comments, error } = await supabase
      .from("comments")
      .select("id,project_id,shot_id,user_id,body,created_at")
      .eq("shot_id", shotId)
      .order("created_at", { ascending: true });

    if (error) {
      return fail(error.message, 400);
    }

    const commentList = (comments ?? []) as BasicComment[];
    const userIds = [...new Set(commentList.map((item) => item.user_id))];
    if (userIds.length === 0) {
      return ok([]);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    return ok(
      commentList.map((comment) => ({
        ...comment,
        user: profileMap.get(comment.user_id) ?? null,
      })),
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase, user } = await getAuthenticatedContext();
    const raw = await request.json();
    const parsed = commentSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        shot_id: shotId,
        user_id: user.id,
        body: parsed.data.body,
      })
      .select("id,project_id,shot_id,user_id,body,created_at")
      .single();

    if (error) {
      return fail(error.message, 400);
    }

    return ok(data, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
