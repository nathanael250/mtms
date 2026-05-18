import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

export const createDocumentCategory = asyncHandler(async (req, res) => {
  const { name, description, status = "active" } = req.body;

  const [result] = await getPool().query(
    `INSERT INTO document_categories (name, description, status, created_by)
     VALUES (?, ?, ?, ?)`,
    [name, description || null, status, req.user.id]
  );

  const [rows] = await getPool().query(
    "SELECT * FROM document_categories WHERE id = ?",
    [result.insertId]
  );

  res.status(201).json({
    message: "Document category created successfully.",
    category: rows[0],
  });
});

export const listDocumentCategories = asyncHandler(async (req, res) => {
  const values = [];
  let whereClause = "";

  if (req.query.status) {
    whereClause = "WHERE categories.status = ?";
    values.push(req.query.status);
  }

  const [rows] = await getPool().query(
    `SELECT categories.*, users.full_name AS created_by_name
     FROM document_categories AS categories
     JOIN users ON users.id = categories.created_by
     ${whereClause}
     ORDER BY categories.name ASC`,
    values
  );

  res.json({ categories: rows });
});

export const updateDocumentCategory = asyncHandler(async (req, res) => {
  const updates = [];
  const values = [];

  for (const field of ["name", "description", "status"]) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field] || null);
    }
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid category fields were provided.");
  }

  values.push(req.params.id);
  const [result] = await getPool().query(
    `UPDATE document_categories SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    throw new ApiError(404, "Document category not found.");
  }

  res.json({ message: "Document category updated successfully." });
});

export const deleteDocumentCategory = asyncHandler(async (req, res) => {
  const [documents] = await getPool().query(
    "SELECT id FROM documents WHERE category_id = ? LIMIT 1",
    [req.params.id]
  );

  if (documents.length) {
    throw new ApiError(409, "This category is already used by documents.");
  }

  const [result] = await getPool().query(
    "DELETE FROM document_categories WHERE id = ?",
    [req.params.id]
  );

  if (!result.affectedRows) {
    throw new ApiError(404, "Document category not found.");
  }

  res.json({ message: "Document category deleted successfully." });
});
