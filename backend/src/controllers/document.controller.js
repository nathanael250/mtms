import fs from "fs/promises";
import path from "path";
import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { buildDriveMetadata, getDocumentFolderId } from "../services/googleDrive.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const documentSelect = `
  SELECT documents.*, jobs.title AS job_title, jobs.job_code,
         categories.name AS category_name,
         uploader.full_name AS uploaded_by_name,
         reviewer.full_name AS reviewed_by_name
  FROM documents
  JOIN jobs ON jobs.id = documents.job_id
  JOIN document_categories AS categories ON categories.id = documents.category_id
  JOIN users AS uploader ON uploader.id = documents.uploaded_by
  LEFT JOIN users AS reviewer ON reviewer.id = documents.reviewed_by
`;

async function getDocumentOrThrow(documentId) {
  const [rows] = await getPool().query(
    `${documentSelect} WHERE documents.id = ?`,
    [documentId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Document not found.");
  }

  return rows[0];
}

async function getDriveSettings() {
  const [rows] = await getPool().query(
    "SELECT * FROM google_drive_settings ORDER BY id ASC LIMIT 1"
  );

  return rows[0] || { status: "disconnected" };
}

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A file is required.");
  }

  const { job_id, category_id, title, description } = req.body;

  const [[job]] = await getPool().query(
    "SELECT id, title, job_code FROM jobs WHERE id = ? LIMIT 1",
    [job_id]
  );
  if (!job) {
    throw new ApiError(404, "Job not found.");
  }

  const [[category]] = await getPool().query(
    "SELECT id, name, status FROM document_categories WHERE id = ? LIMIT 1",
    [category_id]
  );
  if (!category || category.status !== "active") {
    throw new ApiError(400, "Select an active document category.");
  }

  const driveSettings = await getDriveSettings();
  const folderId = getDocumentFolderId(driveSettings, "pending_approval");
  const driveMetadata = buildDriveMetadata({
    file: req.file,
    settings: driveSettings,
    folderId,
  });

  const [result] = await getPool().query(
    `INSERT INTO documents
     (job_id, category_id, title, description, original_file_name,
      google_drive_file_id, google_drive_file_url, google_drive_folder_id,
      mime_type, file_size, uploaded_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval')`,
    [
      job_id,
      category_id,
      title,
      description || null,
      req.file.originalname,
      driveMetadata.fileId,
      driveMetadata.fileUrl,
      driveMetadata.folderId,
      req.file.mimetype,
      req.file.size,
      req.user.id,
    ]
  );

  await createActivityLog({
    jobId: Number(job_id),
    userId: req.user.id,
    action: "document_uploaded",
    description: `${req.user.full_name} uploaded document "${title}" for approval.`,
  });

  const document = await getDocumentOrThrow(result.insertId);
  res.status(201).json({
    message: "Document uploaded and sent for approval.",
    document,
  });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];

  if (req.user.role !== "admin") {
    filters.push("(documents.status = 'approved' OR documents.uploaded_by = ?)");
    values.push(req.user.id);
  }
  if (req.query.status) {
    filters.push("documents.status = ?");
    values.push(req.query.status);
  }
  if (req.query.job_id) {
    filters.push("documents.job_id = ?");
    values.push(req.query.job_id);
  }
  if (req.query.category_id) {
    filters.push("documents.category_id = ?");
    values.push(req.query.category_id);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await getPool().query(
    `${documentSelect}
     ${whereClause}
     ORDER BY documents.created_at DESC, documents.id DESC`,
    values
  );

  res.json({ documents: rows });
});

export const listPendingDocuments = asyncHandler(async (req, res) => {
  req.query.status = "pending_approval";
  return listDocuments(req, res);
});

export const listMyUploads = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `${documentSelect}
     WHERE documents.uploaded_by = ?
     ORDER BY documents.created_at DESC, documents.id DESC`,
    [req.user.id]
  );

  res.json({ documents: rows });
});

export const getDocumentById = asyncHandler(async (req, res) => {
  const document = await getDocumentOrThrow(req.params.id);

  if (
    req.user.role !== "admin" &&
    document.status !== "approved" &&
    document.uploaded_by !== req.user.id
  ) {
    throw new ApiError(403, "You cannot view this document.");
  }

  res.json({ document });
});

export const approveDocument = asyncHandler(async (req, res) => {
  const document = await getDocumentOrThrow(req.params.id);
  const driveSettings = await getDriveSettings();
  const folderId = getDocumentFolderId(driveSettings, "approved");

  await getPool().query(
    `UPDATE documents
     SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(),
         review_comment = ?, google_drive_folder_id = ?
     WHERE id = ?`,
    [req.user.id, req.body.review_comment || null, folderId, req.params.id]
  );

  await createActivityLog({
    jobId: document.job_id,
    userId: req.user.id,
    action: "document_approved",
    description: `${req.user.full_name} approved document "${document.title}".`,
  });

  res.json({ message: "Document approved successfully." });
});

export const rejectDocument = asyncHandler(async (req, res) => {
  const document = await getDocumentOrThrow(req.params.id);
  const driveSettings = await getDriveSettings();
  const folderId = getDocumentFolderId(driveSettings, "rejected");

  await getPool().query(
    `UPDATE documents
     SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
         review_comment = ?, google_drive_folder_id = ?
     WHERE id = ?`,
    [req.user.id, req.body.review_comment || null, folderId, req.params.id]
  );

  await createActivityLog({
    jobId: document.job_id,
    userId: req.user.id,
    action: "document_rejected",
    description: `${req.user.full_name} rejected document "${document.title}".`,
  });

  res.json({ message: "Document rejected successfully." });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await getDocumentOrThrow(req.params.id);

  if (req.user.role !== "admin" && document.uploaded_by !== req.user.id) {
    throw new ApiError(403, "You cannot delete this document.");
  }

  await getPool().query("DELETE FROM documents WHERE id = ?", [req.params.id]);

  if (document.google_drive_file_url?.startsWith("/uploads/")) {
    const absolutePath = path.resolve(
      process.cwd(),
      document.google_drive_file_url.replace(/^\//, "")
    );
    try {
      await fs.unlink(absolutePath);
    } catch {
      // Keep database deletion as source of truth if the local file is already gone.
    }
  }

  res.json({ message: "Document deleted successfully." });
});
