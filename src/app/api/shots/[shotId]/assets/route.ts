import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { ASSET_KINDS } from "@/lib/constants";
import { ensureProjectSubfolder, uploadFileToDrive } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

type AssetKind = (typeof ASSET_KINDS)[number];

function parseAssetKind(value: FormDataEntryValue | null): AssetKind {
  if (typeof value !== "string") {
    return "reference";
  }
  return ASSET_KINDS.includes(value as AssetKind)
    ? (value as AssetKind)
    : "reference";
}

function makeSafeFileName(name: string): string {
  const normalized = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (normalized.length === 0) {
    return `asset_${Date.now()}.jpg`;
  }
  return normalized.slice(0, 120);
}

function subfolderByKind(kind: AssetKind): "refs" | "edits" | "diagrams" | "exports" {
  switch (kind) {
    case "reference":
      return "refs";
    case "edit":
      return "edits";
    case "diagram_preview":
      return "diagrams";
    case "export":
      return "exports";
    default:
      return "refs";
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase } = await getAuthenticatedContext();

    const { data, error } = await supabase
      .from("shot_assets")
      .select("*")
      .eq("shot_id", shotId)
      .order("created_at", { ascending: false });
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
  context: { params: Promise<{ shotId: string }> },
) {
  try {
    const { shotId } = await readParams(context.params);
    const { supabase, user, googleAccessToken } = await getAuthenticatedContext();
    if (!googleAccessToken) {
      return fail(
        "Google Drive access token is missing. Please sign out and sign in again.",
        401,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = parseAssetKind(formData.get("kind"));
    if (!(file instanceof File)) {
      return fail("`file` is required", 400);
    }
    if (file.size === 0) {
      return fail("Empty file is not allowed", 400);
    }

    const mimeType = file.type || "application/octet-stream";
    if ((kind === "reference" || kind === "edit") && mimeType !== "image/jpeg") {
      return fail("Only JPEG is allowed for reference/edit uploads", 400);
    }

    const { data: shot, error: shotError } = await supabase
      .from("shots")
      .select("id,project_id,title")
      .eq("id", shotId)
      .single();
    if (shotError) {
      return fail(shotError.message, 404);
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,drive_folder_id")
      .eq("id", shot.project_id)
      .single();
    if (projectError) {
      return fail(projectError.message, 404);
    }

    const folder = await ensureProjectSubfolder({
      accessToken: googleAccessToken,
      projectFolderId: project.drive_folder_id,
      subfolder: subfolderByKind(kind),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive({
      accessToken: googleAccessToken,
      parentFolderId: folder.id,
      fileName: makeSafeFileName(file.name),
      mimeType,
      buffer,
    });

    const { data: insertedAsset, error: insertError } = await supabase
      .from("shot_assets")
      .insert({
        shot_id: shotId,
        kind,
        drive_file_id: uploaded.id,
        drive_file_name: uploaded.name,
        drive_web_view_link: uploaded.webViewLink,
        mime_type: uploaded.mimeType ?? mimeType,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        size_bytes: uploaded.sizeBytes ?? null,
        uploaded_by: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      return fail(insertError.message, 400);
    }

    return ok(insertedAsset, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected error", 500);
  }
}
