export type Project = {
  id: string;
  title: string;
  status: string;
  shoot_date: string | null;
  location: string | null;
  drive_folder_url?: string | null;
  drive_folder_id: string;
  created_at: string;
};

export type ProjectDetail = {
  project: {
    id: string;
    title: string;
    status: string;
    shoot_date: string | null;
    location: string | null;
    drive_folder_url: string | null;
  };
  scenes: Scene[];
};

export type ProjectTabKey = "storyboard" | "lighting" | "comments" | "delivery";

export type ProjectMember = {
  project_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  profile: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type Deliverable = {
  id: string;
  project_id: string;
  shot_id: string | null;
  kind: "pdf" | "jpeg" | "zip" | "other";
  drive_file_id: string;
  drive_file_name: string;
  drive_web_view_link: string | null;
  mime_type: string;
  created_by: string | null;
  created_at: string;
};

export type Scene = {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  shots?: Shot[];
};

export type Shot = {
  id: string;
  project_id: string;
  scene_id: string;
  title: string;
  status: string;
  composition_memo: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ShotAsset = {
  id: string;
  shot_id: string;
  kind: string;
  drive_file_id: string;
  drive_file_name: string;
  drive_web_view_link: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};

export type LightingDiagram = {
  id: string;
  shot_id: string;
  diagram_json: Record<string, unknown>;
  preview_asset_id: string | null;
  updated_at: string;
};

export type Comment = {
  id: string;
  project_id: string | null;
  shot_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};
