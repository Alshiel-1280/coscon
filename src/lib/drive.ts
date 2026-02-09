import { Readable } from "node:stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import {
  DRIVE_PROJECT_SUBFOLDERS,
  DRIVE_PROJECTS_FOLDER,
  DRIVE_ROOT_FOLDER,
} from "@/lib/constants";

type DriveFile = {
  id: string;
  name: string;
  webViewLink: string | null;
};

type UploadResult = DriveFile & {
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
};

export type ProjectDriveFolders = {
  projectFolder: DriveFile;
  refsFolder: DriveFile;
  editsFolder: DriveFile;
  diagramsFolder: DriveFile;
  exportsFolder: DriveFile;
};

export type DrivePermissionRole = "reader" | "writer";

function createDriveApi(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({
    version: "v3",
    auth,
  });
}

function escapeDriveQuery(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeFolderName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function formatDatePrefix(input?: string | null): string {
  if (!input) {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
  return input.slice(0, 10);
}

async function findFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<DriveFile | null> {
  const escapedName = escapeDriveQuery(name);
  const parentQuery = parentId
    ? ` and '${escapeDriveQuery(parentId)}' in parents`
    : "";

  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escapedName}'${parentQuery}`,
    fields: "files(id,name,webViewLink)",
    pageSize: 1,
    spaces: "drive",
  });

  const folder = res.data.files?.[0];
  if (!folder?.id || !folder.name) {
    return null;
  }
  return {
    id: folder.id,
    name: folder.name,
    webViewLink: folder.webViewLink ?? null,
  };
}

async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<DriveFile> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id,name,webViewLink",
  });

  const folder = res.data;
  if (!folder.id || !folder.name) {
    throw new Error("Failed to create Drive folder.");
  }

  return {
    id: folder.id,
    name: folder.name,
    webViewLink: folder.webViewLink ?? null,
  };
}

async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<DriveFile> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) {
    return existing;
  }
  return createFolder(drive, name, parentId);
}

export async function ensureProjectSubfolder(input: {
  accessToken: string;
  projectFolderId: string;
  subfolder:
    | keyof typeof DRIVE_PROJECT_SUBFOLDERS
    | (typeof DRIVE_PROJECT_SUBFOLDERS)[keyof typeof DRIVE_PROJECT_SUBFOLDERS];
}): Promise<DriveFile> {
  const drive = createDriveApi(input.accessToken);
  const resolvedName =
    input.subfolder in DRIVE_PROJECT_SUBFOLDERS
      ? DRIVE_PROJECT_SUBFOLDERS[
          input.subfolder as keyof typeof DRIVE_PROJECT_SUBFOLDERS
        ]
      : input.subfolder;
  return ensureFolder(drive, resolvedName, input.projectFolderId);
}

export async function createProjectDriveFolders(input: {
  accessToken: string;
  projectId: string;
  projectTitle: string;
  shootDate?: string | null;
}): Promise<ProjectDriveFolders> {
  const drive = createDriveApi(input.accessToken);

  const root = await ensureFolder(drive, DRIVE_ROOT_FOLDER);
  const projects = await ensureFolder(drive, DRIVE_PROJECTS_FOLDER, root.id);

  const projectFolderName = `${formatDatePrefix(input.shootDate)}_${sanitizeFolderName(input.projectTitle)}_${input.projectId.slice(0, 8)}`;
  const projectFolder = await createFolder(drive, projectFolderName, projects.id);

  const [refsFolder, editsFolder, diagramsFolder, exportsFolder] =
    await Promise.all([
      ensureFolder(drive, DRIVE_PROJECT_SUBFOLDERS.refs, projectFolder.id),
      ensureFolder(drive, DRIVE_PROJECT_SUBFOLDERS.edits, projectFolder.id),
      ensureFolder(drive, DRIVE_PROJECT_SUBFOLDERS.diagrams, projectFolder.id),
      ensureFolder(drive, DRIVE_PROJECT_SUBFOLDERS.exports, projectFolder.id),
    ]);

  return {
    projectFolder,
    refsFolder,
    editsFolder,
    diagramsFolder,
    exportsFolder,
  };
}

export async function uploadFileToDrive(input: {
  accessToken: string;
  parentFolderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<UploadResult> {
  const drive = createDriveApi(input.accessToken);
  const media = {
    mimeType: input.mimeType,
    body: Readable.from(input.buffer),
  };

  const res = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [input.parentFolderId],
      mimeType: input.mimeType,
    },
    media,
    fields: "id,name,webViewLink,mimeType,size,imageMediaMetadata",
  });

  const file = res.data;
  if (!file.id || !file.name) {
    throw new Error("Failed to upload file to Drive.");
  }

  const metadata = file.imageMediaMetadata;
  return {
    id: file.id,
    name: file.name,
    webViewLink: file.webViewLink ?? null,
    mimeType: file.mimeType ?? null,
    sizeBytes: file.size ? Number(file.size) : null,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
  };
}

export async function shareDriveFolderWithUser(input: {
  accessToken: string;
  folderId: string;
  email: string;
  role: DrivePermissionRole;
}): Promise<void> {
  const drive = createDriveApi(input.accessToken);
  await drive.permissions.create({
    fileId: input.folderId,
    sendNotificationEmail: true,
    requestBody: {
      type: "user",
      role: input.role,
      emailAddress: input.email,
    },
    fields: "id",
  });
}
