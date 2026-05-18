import bcrypt from "bcryptjs";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const baseUserSelect = `
  SELECT users.id, users.role_id, roles.name AS role, users.full_name, users.email,
         users.phone, users.status, users.created_at, users.updated_at
  FROM users
  JOIN roles ON roles.id = users.role_id
`;

export const createUser = asyncHandler(async (req, res) => {
  const { role_id, full_name, email, phone, password, status = "active" } =
    req.body;

  const [existing] = await getPool().query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existing.length) {
    throw new ApiError(409, "A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await getPool().query(
    `INSERT INTO users (role_id, full_name, email, phone, password, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [role_id, full_name, email, phone || null, hashedPassword, status]
  );

  const [rows] = await getPool().query(
    `${baseUserSelect} WHERE users.id = ? LIMIT 1`,
    [result.insertId]
  );

  res.status(201).json({
    message: "User created successfully.",
    user: rows[0],
  });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(`${baseUserSelect} ORDER BY users.id DESC`);
  res.json({ users: rows });
});

export const listStaff = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(
    `${baseUserSelect} WHERE roles.name = 'staff' AND users.status = 'active' ORDER BY users.full_name ASC`
  );
  res.json({ users: rows });
});

export const getUserById = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `${baseUserSelect} WHERE users.id = ? LIMIT 1`,
    [req.params.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "User not found.");
  }

  res.json({ user: rows[0] });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { full_name, email, phone, password, role_id, status } = req.body;
  const [existing] = await getPool().query(
    "SELECT id FROM users WHERE id = ? LIMIT 1",
    [req.params.id]
  );

  if (!existing.length) {
    throw new ApiError(404, "User not found.");
  }

  if (email) {
    const [duplicates] = await getPool().query(
      "SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1",
      [email, req.params.id]
    );

    if (duplicates.length) {
      throw new ApiError(409, "Another user is already using this email.");
    }
  }

  const updates = [];
  const values = [];

  if (full_name !== undefined) {
    updates.push("full_name = ?");
    values.push(full_name);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email);
  }
  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone || null);
  }
  if (role_id !== undefined) {
    updates.push("role_id = ?");
    values.push(role_id);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push("password = ?");
    values.push(hashedPassword);
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid user fields were provided.");
  }

  values.push(req.params.id);

  await getPool().query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const [rows] = await getPool().query(
    `${baseUserSelect} WHERE users.id = ? LIMIT 1`,
    [req.params.id]
  );

  res.json({
    message: "User updated successfully.",
    user: rows[0],
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const [result] = await getPool().query("DELETE FROM users WHERE id = ?", [
    req.params.id,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "User not found.");
  }

  res.json({ message: "User deleted successfully." });
});

