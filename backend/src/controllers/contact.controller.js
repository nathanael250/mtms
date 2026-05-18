import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

async function getContactOrThrow(contactId) {
  const [rows] = await getPool().query(
    `SELECT contacts.*, categories.name AS category_name, creator.full_name AS created_by_name
     FROM contacts
     JOIN contact_categories categories ON categories.id = contacts.category_id
     JOIN users AS creator ON creator.id = contacts.created_by
     WHERE contacts.id = ?`,
    [contactId]
  );
  if (!rows.length) {
    throw new ApiError(404, "Contact not found.");
  }
  return rows[0];
}

export const listContactCategories = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(
    "SELECT * FROM contact_categories ORDER BY name ASC"
  );
  res.json({ categories: rows });
});

export const createContactCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const [result] = await getPool().query(
    "INSERT INTO contact_categories (name) VALUES (?)",
    [name]
  );
  res.status(201).json({
    message: "Contact category created successfully.",
    category: { id: result.insertId, name },
  });
});

export const createContact = asyncHandler(async (req, res) => {
  const {
    full_name,
    phone,
    email,
    category_id,
    custom_category,
    company_name,
    address,
    notes,
    created_by,
  } = req.body;

  if (Number(category_id) === 7 && !custom_category) {
    throw new ApiError(422, "Custom category is required when category is other.");
  }

  const [result] = await getPool().query(
    `INSERT INTO contacts
     (full_name, phone, email, category_id, custom_category, company_name, address, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      full_name,
      phone || null,
      email || null,
      category_id,
      custom_category || null,
      company_name || null,
      address || null,
      notes || null,
      created_by,
    ]
  );

  const contact = await getContactOrThrow(result.insertId);
  res.status(201).json({ message: "Contact created successfully.", contact });
});

export const listContacts = asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];

  if (req.query.search) {
    const search = `%${req.query.search}%`;
    filters.push(
      `(contacts.full_name LIKE ? OR contacts.phone LIKE ? OR contacts.email LIKE ? OR contacts.company_name LIKE ?)`
    );
    values.push(search, search, search, search);
  }

  if (req.query.category_id) {
    filters.push("contacts.category_id = ?");
    values.push(req.query.category_id);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT contacts.*, categories.name AS category_name, creator.full_name AS created_by_name
     FROM contacts
     JOIN contact_categories categories ON categories.id = contacts.category_id
     JOIN users AS creator ON creator.id = contacts.created_by
     ${whereClause}
     ORDER BY contacts.id DESC`,
    values
  );
  res.json({ contacts: rows });
});

export const getContactById = asyncHandler(async (req, res) => {
  const contact = await getContactOrThrow(req.params.id);
  res.json({ contact });
});

export const updateContact = asyncHandler(async (req, res) => {
  await getContactOrThrow(req.params.id);
  const updates = [];
  const values = [];

  for (const field of [
    "full_name",
    "phone",
    "email",
    "category_id",
    "custom_category",
    "company_name",
    "address",
    "notes",
  ]) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field] || null);
    }
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid contact fields were provided.");
  }

  values.push(req.params.id);
  await getPool().query(
    `UPDATE contacts SET ${updates.join(", ")} WHERE id = ?`,
    values
  );
  const contact = await getContactOrThrow(req.params.id);
  res.json({ message: "Contact updated successfully.", contact });
});

export const deleteContact = asyncHandler(async (req, res) => {
  const [result] = await getPool().query("DELETE FROM contacts WHERE id = ?", [
    req.params.id,
  ]);
  if (!result.affectedRows) {
    throw new ApiError(404, "Contact not found.");
  }
  res.json({ message: "Contact deleted successfully." });
});

