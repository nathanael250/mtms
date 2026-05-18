import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const pool = getPool();

  const [[jobStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_jobs,
       SUM(status = 'pending') AS pending_jobs,
       SUM(status = 'ongoing') AS ongoing_jobs,
       SUM(status = 'completed_pending_approval') AS jobs_pending_approval,
       SUM(status = 'completed') AS completed_jobs,
       SUM(status = 'cancelled') AS cancelled_jobs
     FROM jobs`
  );

  const [[taskStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_tasks,
       SUM(status = 'ongoing') AS ongoing_tasks,
       SUM(status = 'completed') AS completed_tasks
     FROM tasks`
  );

  const [[mentionStats]] = await pool.query(
    `SELECT
       SUM(status = 'unread') AS unread_mentions,
       SUM(status = 'resolved') AS resolved_mentions
     FROM report_mentions`
  );

  const [recentActivity] = await pool.query(
    `SELECT activity_logs.*, users.full_name AS user_name
     FROM activity_logs
     JOIN users ON users.id = activity_logs.user_id
     ORDER BY activity_logs.id DESC
     LIMIT 10`
  );

  res.json({
    stats: {
      ...jobStats,
      ...taskStats,
      ...mentionStats,
    },
    recentActivity,
  });
});

export const getStaffDashboard = asyncHandler(async (req, res) => {
  const pool = getPool();
  const userId = req.user.id;

  const [[taskStats]] = await pool.query(
    `SELECT
       COUNT(*) AS my_tasks,
       SUM(status = 'ongoing') AS my_ongoing_tasks,
       SUM(status = 'completed') AS my_completed_tasks
     FROM tasks
     WHERE assigned_to = ?`,
    [userId]
  );

  const [[mentionStats]] = await pool.query(
    `SELECT
       SUM(mentioned_user_id = ?) AS mentions_assigned_to_me,
       SUM(mentioned_by = ?) AS mentions_i_created
     FROM report_mentions`,
    [userId, userId]
  );

  const [recentTasks] = await pool.query(
    `SELECT tasks.*, jobs.title AS job_title
     FROM tasks
     JOIN jobs ON jobs.id = tasks.job_id
     WHERE tasks.assigned_to = ?
     ORDER BY tasks.id DESC
     LIMIT 10`,
    [userId]
  );

  res.json({
    stats: {
      ...taskStats,
      ...mentionStats,
    },
    recentTasks,
  });
});
