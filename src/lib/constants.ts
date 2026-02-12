export const APP_NAME = "コスコンテっ！";

export const SHOT_STATUSES = [
  "構想",
  "未撮影",
  "撮影済",
  "現像済",
  "共有済",
] as const;

export const PROJECT_STATUSES = [
  "準備中",
  "撮影中",
  "現像中",
  "納品済み",
] as const;

export const MEMBER_ROLES = ["owner", "editor", "viewer"] as const;

export const ASSET_KINDS = [
  "reference",
  "edit",
  "diagram_preview",
  "export",
] as const;

export const DELIVERABLE_KINDS = ["pdf", "jpeg", "zip", "other"] as const;

export type ShotStatus = (typeof SHOT_STATUSES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];
export type AssetKind = (typeof ASSET_KINDS)[number];
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];

export const DRIVE_ROOT_FOLDER = "CosplayShoot";
export const DRIVE_PROJECTS_FOLDER = "Projects";

export const DRIVE_PROJECT_SUBFOLDERS = {
  refs: "10_refs",
  edits: "40_edits",
  diagrams: "60_diagrams",
  exports: "90_exports",
} as const;
