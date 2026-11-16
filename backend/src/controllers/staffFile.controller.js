import fs from "fs/promises";
import { getPool } from "../config/database.js";
import {
  deleteDriveFile,
  uploadStaffFileToDrive,
} from "../services/googleDrive.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const ATTACH_LABELS = { final_product: "Final product", reference: "Reference file" };

async function getDriveSettings() {
  const [rows] = await getPool().query(
    "SELECT * FROM google_drive_settings ORDER BY id ASC LIMIT 1"
  );
  return rows[0] || { status: "disconnected" };
}

// Staff may attach to their own report or to a task assigned to them; admins to anything.
async function assertCanAttach(user, relatedType, relatedId) {
  if (!["task", "report"].includes(relatedType)) {
    throw new ApiError(400, "Files can be attached to a task or a report.");
  }
  const table = relatedType === "task" ? "tasks" : "task_daily_reports";
  const ownerColumn = relatedType === "task" ? "assigned_to" : "user_id";
  const [rows] = await getPool().query(
    `SELECT ${ownerColumn} AS owner_id FROM ${table} WHERE id = ? LIMIT 1`,
    [relatedId]
  );
  if (!rows.length) {
    throw new ApiError(404, `${relatedType === "task" ? "Task" : "Report"} not found.`);
  }
  if (user.role !== "admin" && rows[0].owner_id !== user.id) {
    throw new ApiError(403, "You can only attach files to your own work.");
  }
}

async function addAttachment({ relatedType, relatedId, name, url, mimeType, userId }) {
  const [result] = await getPool().query(
    `INSERT INTO attachments (related_type, related_id, file_name, file_path, file_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [relatedType, relatedId, name.slice(0, 255), url.slice(0, 255), mimeType || "link/drive", userId]
  );
  return result.insertId;
}

// Uploads one file into the signed-in staff member's Google Drive folder. Optionally
// also attaches its link to a task or report as "Final product" or "Reference file".
export const uploadStaffFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A file is required.");
  }

  try {
    const { attach_type, attach_id, label } = req.body;
    if (attach_type) {
      await assertCanAttach(req.user, attach_type, attach_id);
    }

    const settings = await getDriveSettings();
    if (settings.status !== "connected") {
      throw new ApiError(
        400,
        "Google Drive is not connected yet. Ask an admin to connect it in Settings."
      );
    }

    const drive = await uploadStaffFileToDrive({ file: req.file, settings, user: req.user });
    const [result] = await getPool().query(
      `INSERT INTO staff_files
       (user_id, file_name, drive_file_id, drive_url, drive_folder_id, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.file.originalname,
        drive.fileId,
        drive.fileUrl,
        drive.folderId,
        req.file.mimetype,
        req.file.size,
      ]
    );

    if (attach_type) {
      const prefix = ATTACH_LABELS[label] || ATTACH_LABELS.final_product;
      await addAttachment({
        relatedType: attach_type,
        relatedId: attach_id,
        name: `${prefix}: ${req.file.originalname}`,
        url: drive.fileUrl,
        mimeType: req.file.mimetype,
        userId: req.user.id,
      });
    }

    res.status(201).json({
      message: "File uploaded to your Google Drive folder.",
      file: {
        id: result.insertId,
        file_name: req.file.originalname,
        drive_url: drive.fileUrl,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      },
    });
  } finally {
    // The copy on this server is only a temporary stop on the way to Google Drive.
    await fs.unlink(req.file.path).catch(() => {});
  }
});

// Pastes a Google Drive link onto a task or report as "Reference file".
export const attachReferenceLink = asyncHandler(async (req, res) => {
  const { related_type, related_id } = req.body;
  const url = String(req.body.url || "").trim();
  const note = String(req.body.name || "").trim();

  let host = "";
  try {
    const parsed = new URL(url);
    host = parsed.protocol === "https:" ? parsed.hostname : "";
  } catch {
    host = "";
  }
  if (!["drive.google.com", "docs.google.com"].includes(host)) {
    throw new ApiError(400, "Paste a Google Drive link (it starts with https://drive.google.com).");
  }
  if (url.length > 255) {
    throw new ApiError(400, "This link is too long.");
  }

  await assertCanAttach(req.user, related_type, related_id);
  const id = await addAttachment({
    relatedType: related_type,
    relatedId: related_id,
    name: note ? `Reference file: ${note}` : "Reference file",
    url,
    mimeType: "link/drive",
    userId: req.user.id,
  });
  res.status(201).json({ message: "Reference file added.", attachment_id: id });
});

// Staff see only their own folder. An admin can look at one staff member's folder with ?user_id=.
export const listStaffFiles = asyncHandler(async (req, res) => {
  const userId = req.user.role === "admin" ? req.query.user_id : req.user.id;
  if (!userId) {
    throw new ApiError(400, "Choose a staff member.");
  }
  const [rows] = await getPool().query(
    `SELECT id, user_id, file_name, drive_url, mime_type, file_size, created_at
     FROM staff_files WHERE user_id = ? ORDER BY id DESC`,
    [userId]
  );
  res.json({ files: rows });
});

// Admin: every staff member with how many files are in their folder.
export const listStaffFolders = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT users.id, users.full_name, COUNT(staff_files.id) AS file_count,
            MAX(staff_files.created_at) AS last_upload
     FROM users
     JOIN roles ON roles.id = users.role_id
     LEFT JOIN staff_files ON staff_files.user_id = users.id
     WHERE roles.name = 'staff' AND users.status = 'active'
     GROUP BY users.id, users.full_name
     ORDER BY users.full_name ASC`
  );
  res.json({ folders: rows });
});

export const deleteStaffFile = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query("SELECT * FROM staff_files WHERE id = ?", [
    req.params.id,
  ]);
  if (!rows.length) {
    throw new ApiError(404, "File not found.");
  }
  if (req.user.role !== "admin" && rows[0].user_id !== req.user.id) {
    throw new ApiError(403, "You can only delete your own files.");
  }
  await getPool().query("DELETE FROM staff_files WHERE id = ?", [req.params.id]);
  await deleteDriveFile({
    settings: await getDriveSettings(),
    fileId: rows[0].drive_file_id,
  });
  res.json({ message: "File deleted." });
});
