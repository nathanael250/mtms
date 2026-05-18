import { getPool } from "../config/database.js";
import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Authentication token is required.");
  }

  const decoded = verifyToken(token);
  const [rows] = await getPool().query(
    `SELECT users.id, users.role_id, users.full_name, users.email, users.phone,
            users.status, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.id = ? LIMIT 1`,
    [decoded.userId]
  );

  if (!rows.length || rows[0].status !== "active") {
    throw new ApiError(401, "User account is not active.");
  }

  req.user = rows[0];
  next();
});

export function authorizeRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to access this."));
      return;
    }

    next();
  };
}

