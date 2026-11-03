import fs from "fs/promises";
import path from "path";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A file is required.");
  }

  const { related_type, related_id } = req.body;

  if (related_type === "report" && req.user.role !== "admin") {
    const [owners] = await getPool().query(
      "SELECT user_id FROM task_daily_reports WHERE id = ? LIMIT 1",
      [related_id]
    );
    if (!owners.length || owners[0].user_id !== req.user.id) {
      await fs.unlink(req.file.path).catch(() => {});
      throw new ApiError(403, "You can only attach files to your own report.");
    }
  }

  const relativePath = req.file.path.replace(`${process.cwd()}/`, "");

  const [result] = await getPool().query(
    `INSERT INTO attachments (related_type, related_id, file_name, file_path, file_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      related_type,
      related_id,
      req.file.originalname,
      relativePath,
      req.file.mimetype,
      req.user.id,
    ]
  );

  res.status(201).json({
    message: "Attachment uploaded successfully.",
    attachment: {
      id: result.insertId,
      related_type,
      related_id,
      file_name: req.file.originalname,
      file_path: relativePath,
      file_type: req.file.mimetype,
      uploaded_by: req.user.id,
    },
  });
});

export const getAttachmentById = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT attachments.*, users.full_name AS uploaded_by_name
     FROM attachments
     JOIN users ON users.id = attachments.uploaded_by
     WHERE attachments.id = ?`,
    [req.params.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Attachment not found.");
  }

  res.json({ attachment: rows[0] });
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    "SELECT * FROM attachments WHERE id = ?",
    [req.params.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Attachment not found.");
  }

  await getPool().query("DELETE FROM attachments WHERE id = ?", [req.params.id]);

  const absolutePath = path.resolve(process.cwd(), rows[0].file_path);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // File may already be gone; keep DB deletion as source of truth.
  }

  res.json({ message: "Attachment deleted successfully." });
});

