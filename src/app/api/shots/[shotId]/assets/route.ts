import { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth";
import { ensureProjectSubfolder, uploadFileToDrive } from "@/lib/drive";
import { fail, ok } from "@/lib/http";
import { readParams } from "@/lib/route";

const ALLOWED_REFERENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function parseReferenceMimeType(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (ALLOWED_REFERENCE_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }
  return null;
}

function extensionByMimeType(mimeType: string): string {
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "application/pdf") {
    return ".pdf";
  }
  return ".jpg";
}

function makeSafeFileName(name: string, mimeType: string): string {
  const normalized = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  if (normalized.length === 0) {
    return `asset_${Date.now()}${extensionByMimeType(mimeType)}`;
  }
  return normalized.slice(0, 120);
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
    if (!(file instanceof File)) {
      return fail("`file` is required", 400);
    }
    if (file.size === 0) {
      return fail("Empty file is not allowed", 400);
    }

    const kind = "reference";
    const mimeType = parseReferenceMimeType(file);
    if (!mimeType) {
      return fail("Only JPG / PNG / PDF are allowed", 400);
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

    const { count: referenceAssetCount, error: countError } = await supabase
      .from("shot_assets")
      .select("id", { count: "exact", head: true })
      .eq("shot_id", shotId)
      .eq("kind", "reference");
    if (countError) {
      return fail(countError.message, 400);
    }
    if ((referenceAssetCount ?? 0) >= 3) {
      return fail("参考画像は最大3枚までです。", 400);
    }

    const folder = await ensureProjectSubfolder({
      accessToken: googleAccessToken,
      projectFolderId: project.drive_folder_id,
      subfolder: "refs",
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive({
      accessToken: googleAccessToken,
      parentFolderId: folder.id,
      fileName: makeSafeFileName(file.name, mimeType),
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
