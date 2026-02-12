import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { createProjectDriveFolders } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { createProjectSchema } from "@/lib/validators";

export async function GET() {
  try {
    const { supabase } = await getAuthenticatedContext();
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,status,shoot_date,location,drive_folder_url,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return fail(error.message, 400);
    }

    return ok(data ?? []);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unauthorized",
      401,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, googleAccessToken } = await getAuthenticatedContext();
    if (!googleAccessToken) {
      return fail(
        "Google Drive access token is missing. Please sign out and sign in again.",
        401,
      );
    }

    const raw = await request.json();
    const parsed = createProjectSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid request payload", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const projectId = crypto.randomUUID();

    const folders = await createProjectDriveFolders({
      accessToken: googleAccessToken,
      projectId,
      projectTitle: input.title,
      shootDate: input.shootDate ?? null,
    });

    const { data: insertedProject, error: insertError } = await supabase
      .from("projects")
      .insert({
        id: projectId,
        title: input.title,
        owner_user_id: user.id,
        drive_folder_id: folders.projectFolder.id,
        drive_folder_name: folders.projectFolder.name,
        drive_folder_url: folders.projectFolder.webViewLink,
        shoot_date: input.shootDate ?? null,
        location: input.location ?? null,
      })
      .select("*")
      .single();

    if (insertError) {
      return fail(insertError.message, 400);
    }

    const { error: memberError } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: user.id,
      role: "owner",
      added_by: user.id,
    });
    if (memberError) {
      return fail(memberError.message, 400);
    }

    await supabase.from("scenes").insert({
      project_id: projectId,
      title: "キャラ1",
      sort_order: 0,
    });

    return ok(insertedProject, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
