import bcrypt from "bcryptjs";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";
import { sendCredentialsNotification } from "../services/notification.service.js";

// Password rule: second name + last digits of the phone number.
const CREDENTIAL_PHONE_DIGITS = 3;

export function buildCredentialPassword(fullName, phone) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const secondName = parts[1] || parts[0] || "";
  const digits = String(phone || "").replace(/\D/g, "");
  if (!secondName || digits.length < CREDENTIAL_PHONE_DIGITS) {
    return "";
  }
  return `${secondName}${digits.slice(-CREDENTIAL_PHONE_DIGITS)}`;
}

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
    "SELECT id, role_id FROM users WHERE id = ? LIMIT 1",
    [req.params.id]
  );

  if (!existing.length) {
    throw new ApiError(404, "User not found.");
  }

  if (Number(req.params.id) === req.user.id) {
    if (status === "inactive") {
      throw new ApiError(400, "You cannot deactivate your own account.");
    }
    if (role_id !== undefined && Number(role_id) !== existing[0].role_id) {
      throw new ApiError(400, "You cannot change your own role.");
    }
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


export const sendCredentials = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    "SELECT id, full_name, email, phone, status FROM users WHERE id = ? LIMIT 1",
    [req.params.id]
  );
  const target = rows[0];

  if (!target) {
    throw new ApiError(404, "User not found.");
  }
  if (target.id === req.user.id) {
    throw new ApiError(400, "You cannot reset your own password this way.");
  }
  if (!target.phone) {
    throw new ApiError(400, "This user has no phone number. Add one first.");
  }

  const password = buildCredentialPassword(target.full_name, target.phone);
  if (!password) {
    throw new ApiError(
      400,
      `The phone number needs at least ${CREDENTIAL_PHONE_DIGITS} digits to build the password.`
    );
  }

  // Send first: the password is only changed once the message was delivered.
  let status;
  try {
    status = await sendCredentialsNotification({
      user: target,
      password,
      loginUrl: env.loginUrl,
    });
  } catch (error) {
    console.error("Credentials WhatsApp failed:", error.message);
    throw new ApiError(
      502,
      "WhatsApp message could not be sent. The password was not changed."
    );
  }
  if (status === "disabled") {
    throw new ApiError(
      400,
      "WhatsApp notifications are disabled. The password was not changed."
    );
  }

  await getPool().query("UPDATE users SET password = ? WHERE id = ?", [
    await bcrypt.hash(password, 10),
    target.id,
  ]);

  res.json({ message: `Login details sent to ${target.full_name} on WhatsApp.` });
});
