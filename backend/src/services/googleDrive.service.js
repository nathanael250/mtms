import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

export function getDocumentFolderId(settings, status) {
  if (status === "approved") {
    return settings?.approved_folder_id || settings?.root_folder_id || null;
  }
  if (status === "rejected") {
    return settings?.rejected_folder_id || settings?.root_folder_id || null;
  }

  return settings?.pending_folder_id || settings?.root_folder_id || null;
}

function sanitizeDriveName(value) {
  return String(value || "Unknown")
    .replace(/[\\/<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getOAuthClient() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRefreshToken) {
    throw new ApiError(
      400,
      "Google Drive is not fully configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
    );
  }

  const client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri
  );

  client.setCredentials({ refresh_token: env.googleRefreshToken });
  return client;
}

function getDrive(settings) {
  if (settings?.status !== "connected") {
    throw new ApiError(400, "Google Drive is not connected.");
  }

  return google.drive({ version: "v3", auth: getOAuthClient() });
}

async function findOrCreateFolder(drive, name, parentId) {
  const safeName = sanitizeDriveName(name);
  const escapedName = safeName.replace(/'/g, "\\'");
  const parentFilter = parentId ? `'${parentId}' in parents and ` : "";

  const response = await drive.files.list({
    q: `${parentFilter}name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });

  if (response.data.files?.length) {
    return response.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });

  return created.data.id;
}

async function ensureDocumentPath(drive, settings, status, pathParts) {
  let currentFolderId = getDocumentFolderId(settings, status);

  if (!currentFolderId) {
    throw new ApiError(
      400,
      "Google Drive folder is not configured for this document status."
    );
  }

  for (const part of pathParts) {
    currentFolderId = await findOrCreateFolder(drive, part, currentFolderId);
  }

  return currentFolderId;
}

export async function uploadDocumentToEmployeeFolder({
  file,
  settings,
  user,
  job,
  status = "approved",
  categoryName,
}) {
  const drive = getDrive(settings);
  const employeeFolderName = sanitizeDriveName(user.full_name);
  const jobFolderName = sanitizeDriveName(job.job_code || job.title);
  const pathParts =
    status === "approved" && categoryName
      ? [employeeFolderName, jobFolderName, categoryName]
      : [employeeFolderName, jobFolderName];
  const folderId = await ensureDocumentPath(drive, settings, status, pathParts);

  const uploaded = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: uploaded.data.id,
    fileUrl: uploaded.data.webViewLink,
    folderId,
  };
}

export async function moveDocumentToReviewFolder({
  document,
  settings,
  status,
  categoryName,
}) {
  if (!document.google_drive_file_id?.startsWith("local-")) {
    const drive = getDrive(settings);
    const employeeFolderName = sanitizeDriveName(document.uploaded_by_name);
    const jobFolderName = sanitizeDriveName(document.job_code || document.job_title);
    const pathParts =
      status === "approved"
        ? [employeeFolderName, jobFolderName, categoryName]
        : [employeeFolderName, jobFolderName];
    const folderId = await ensureDocumentPath(drive, settings, status, pathParts);

    const current = await drive.files.get({
      fileId: document.google_drive_file_id,
      fields: "parents",
    });
    const previousParents = (current.data.parents || []).join(",");

    await drive.files.update({
      fileId: document.google_drive_file_id,
      addParents: folderId,
      removeParents: previousParents || undefined,
      fields: "id, parents",
    });

    return folderId;
  }

  return getDocumentFolderId(settings, status);
}

export function buildLocalDocumentMetadata({ file, settings, folderId }) {
  const localFileId = `local-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const relativePath = file.path.replace(`${process.cwd()}${path.sep}`, "");

  return {
    fileId: localFileId,
    fileUrl:
      settings?.status === "connected" && settings.root_folder_id
        ? `https://drive.google.com/file/d/${localFileId}/view`
        : `/${relativePath}`,
    folderId,
  };
}
