import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listActivityLogs = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT activity_logs.*, users.full_name AS user_name
     FROM activity_logs
     JOIN users ON users.id = activity_logs.user_id
     ORDER BY activity_logs.id DESC`
  );

  res.json({ activityLogs: rows });
});
