import bcrypt from "bcryptjs";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { signToken } from "../utils/jwt.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await getPool().query(
    `SELECT users.id, users.role_id, users.full_name, users.email, users.phone,
            users.password, users.status, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.email = ? LIMIT 1`,
    [email]
  );

  const user = rows[0];

  if (!user || user.status !== "active") {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
  });

  delete user.password;

  res.json({
    message: "Login successful.",
    token,
    user,
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: "Logout successful." });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

