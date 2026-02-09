import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Comment,
  Deliverable,
  LightingDiagram,
  Project,
  ProjectDetail,
  ProjectMember,
  Scene,
  Shot,
  ShotAsset,
} from "@/types/app";

type ProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function decorateComments(
  comments: Comment[],
  profiles: ProfileSummary[],
): Comment[] {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return comments.map((comment) => ({
    ...comment,
    user: profileMap.get(comment.user_id) ?? null,
  }));
}

export async function getProjectsForUser(
  supabase: SupabaseClient,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,title,status,shoot_date,location,drive_folder_id,drive_folder_url,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Project[];
}

export async function getProjectDetailById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectDetail | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,title,status,shoot_date,location,drive_folder_url")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!project) {
    return null;
  }

  const [{ data: scenes, error: scenesError }, { data: shots, error: shotsError }] =
    await Promise.all([
      supabase
        .from("scenes")
        .select("id,project_id,title,sort_order,created_at,updated_at")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("shots")
        .select(
          "id,project_id,scene_id,title,status,composition_memo,sort_order,created_at,updated_at",
        )
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (scenesError) {
    throw new Error(scenesError.message);
  }
  if (shotsError) {
    throw new Error(shotsError.message);
  }

  const shotList = (shots ?? []) as Shot[];
  const sceneList = ((scenes ?? []) as Scene[]).map((scene) => ({
    ...scene,
    shots: shotList.filter((shot) => shot.scene_id === scene.id),
  }));

  return {
    project: project as ProjectDetail["project"],
    scenes: sceneList,
  };
}

export async function getProjectComments(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id,project_id,shot_id,user_id,body,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const commentList = (comments ?? []) as Comment[];
  const userIds = [...new Set(commentList.map((item) => item.user_id))];
  if (userIds.length === 0) {
    return commentList;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url")
    .in("id", userIds);
  if (profileError) {
    throw new Error(profileError.message);
  }

  return decorateComments(commentList, (profiles ?? []) as ProfileSummary[]);
}

type MemberRow = {
  project_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  profiles:
    | {
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

export async function getProjectMembers(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "project_id,user_id,role,created_at,profiles:user_id(id,email,display_name,avatar_url)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as MemberRow[]).map((row) => ({
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    profile: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
  }));
}

export async function getProjectDeliverables(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) {
    // deliverables table might not be migrated yet in an old environment.
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []) as Deliverable[];
}

export async function getShotWorkspace(
  supabase: SupabaseClient,
  shotId: string,
): Promise<{
  shot: Shot;
  project: Pick<Project, "id" | "title">;
  scenes: Pick<Scene, "id" | "title" | "sort_order">[];
  assets: ShotAsset[];
  lighting: LightingDiagram | null;
} | null> {
  const { data: shot, error: shotError } = await supabase
    .from("shots")
    .select(
      "id,project_id,scene_id,title,status,composition_memo,sort_order,created_at,updated_at",
    )
    .eq("id", shotId)
    .maybeSingle();
  if (shotError) {
    throw new Error(shotError.message);
  }
  if (!shot) {
    return null;
  }

  const [{ data: project, error: projectError }, { data: scenes, error: scenesError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,title")
        .eq("id", shot.project_id)
        .single(),
      supabase
        .from("scenes")
        .select("id,title,sort_order")
        .eq("project_id", shot.project_id)
        .order("sort_order", { ascending: true }),
    ]);

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (scenesError) {
    throw new Error(scenesError.message);
  }

  const [{ data: assets, error: assetsError }, { data: lighting, error: lightingError }] =
    await Promise.all([
      supabase
        .from("shot_assets")
        .select(
          "id,shot_id,kind,drive_file_id,drive_file_name,drive_web_view_link,mime_type,width,height,size_bytes,created_at",
        )
        .eq("shot_id", shot.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lighting_diagrams")
        .select("id,shot_id,diagram_json,preview_asset_id,updated_at")
        .eq("shot_id", shot.id)
        .maybeSingle(),
    ]);

  if (assetsError) {
    throw new Error(assetsError.message);
  }
  if (lightingError) {
    throw new Error(lightingError.message);
  }

  return {
    shot: shot as Shot,
    project: project as Pick<Project, "id" | "title">,
    scenes: (scenes ?? []) as Pick<Scene, "id" | "title" | "sort_order">[],
    assets: (assets ?? []) as ShotAsset[],
    lighting: (lighting as LightingDiagram | null) ?? null,
  };
}

export async function getShotComments(
  supabase: SupabaseClient,
  shotId: string,
): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id,project_id,shot_id,user_id,body,created_at")
    .eq("shot_id", shotId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const commentList = (comments ?? []) as Comment[];
  const userIds = [...new Set(commentList.map((item) => item.user_id))];
  if (userIds.length === 0) {
    return commentList;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url")
    .in("id", userIds);
  if (profileError) {
    throw new Error(profileError.message);
  }
  return decorateComments(commentList, (profiles ?? []) as ProfileSummary[]);
}
