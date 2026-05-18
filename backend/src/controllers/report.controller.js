import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

async function getReportOrThrow(reportId) {
  const [rows] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name, tasks.title AS task_title, tasks.job_id
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     JOIN tasks ON tasks.id = reports.task_id
     WHERE reports.id = ?`,
    [reportId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Report not found.");
  }

  return rows[0];
}

export const createReport = asyncHandler(async (req, res) => {
  const { task_id, user_id, report_date, activity_done, location, comment } = req.body;
  const reportUserId = Number(user_id);

  const [tasks] = await getPool().query(
    "SELECT id, title, assigned_to, job_id FROM tasks WHERE id = ? LIMIT 1",
    [task_id]
  );

  if (!tasks.length) {
    throw new ApiError(404, "Task not found.");
  }

  if (req.user.role !== "admin" && tasks[0].assigned_to !== req.user.id) {
    throw new ApiError(403, "You can only add a report to your own task.");
  }

  if (req.user.role !== "admin" && reportUserId !== req.user.id) {
    throw new ApiError(403, "You can only submit a report as yourself.");
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO task_daily_reports (task_id, user_id, report_date, activity_done, location, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task_id, reportUserId, report_date, activity_done, location || null, comment || null]
    );

    await createActivityLog(
      {
        jobId: tasks[0].job_id,
        taskId: task_id,
        userId: req.user.id,
        action: "report_added",
        description: `${req.user.full_name} added a daily report for task "${tasks[0].title}".`,
      },
      connection
    );

    await connection.commit();
    const report = await getReportOrThrow(result.insertId);
    res.status(201).json({ message: "Report created successfully.", report });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const listReports = asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];

  if (req.query.task_id) {
    filters.push("reports.task_id = ?");
    values.push(req.query.task_id);
  }
  if (req.query.user_id) {
    filters.push("reports.user_id = ?");
    values.push(req.query.user_id);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name, tasks.title AS task_title
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     JOIN tasks ON tasks.id = reports.task_id
     ${whereClause}
     ORDER BY reports.report_date DESC, reports.id DESC`,
    values
  );

  res.json({ reports: rows });
});

export const getReportById = asyncHandler(async (req, res) => {
  const report = await getReportOrThrow(req.params.id);
  const [mentions] = await getPool().query(
    `SELECT mentions.*, author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     WHERE mentions.report_id = ?`,
    [req.params.id]
  );
  const [attachments] = await getPool().query(
    `SELECT attachments.*, users.full_name AS uploaded_by_name
     FROM attachments
     JOIN users ON users.id = attachments.uploaded_by
     WHERE related_type = 'report' AND related_id = ?`,
    [req.params.id]
  );

  res.json({ report, mentions, attachments });
});

export const getReportsByTask = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     WHERE reports.task_id = ?
     ORDER BY reports.report_date DESC, reports.id DESC`,
    [req.params.id]
  );

  res.json({ reports: rows });
});

export const getReportsByJob = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name, tasks.title AS task_title
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     JOIN tasks ON tasks.id = reports.task_id
     WHERE tasks.job_id = ?
     ORDER BY reports.report_date DESC, reports.id DESC`,
    [req.params.id]
  );

  res.json({ reports: rows });
});

export const updateReport = asyncHandler(async (req, res) => {
  const report = await getReportOrThrow(req.params.id);
  if (
    req.user.role !== "admin" &&
    (report.user_id !== req.user.id ||
      report.report_date !== new Date().toISOString().slice(0, 10))
  ) {
    throw new ApiError(
      403,
      "You can only edit your own report on the same day."
    );
  }

  const updates = [];
  const values = [];

  for (const field of ["report_date", "activity_done", "location", "comment"]) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field] || null);
    }
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid report fields were provided.");
  }

  values.push(req.params.id);
  await getPool().query(
    `UPDATE task_daily_reports SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  await createActivityLog({
    jobId: report.job_id,
    taskId: report.task_id,
    userId: req.user.id,
    action: "report_updated",
    description: `${req.user.full_name} updated a daily report for task "${report.task_title}".`,
  });

  res.json({ message: "Report updated successfully." });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await getReportOrThrow(req.params.id);
  if (req.user.role !== "admin" && report.user_id !== req.user.id) {
    throw new ApiError(403, "You cannot delete this report.");
  }

  await getPool().query("DELETE FROM task_daily_reports WHERE id = ?", [
    req.params.id,
  ]);

  res.json({ message: "Report deleted successfully." });
});
