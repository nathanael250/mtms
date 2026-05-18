import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

const baseJobSelect = `
  SELECT jobs.*, creator.full_name AS created_by_name,
         marker.full_name AS marked_completed_by_name,
         approver.full_name AS approved_by_name
  FROM jobs
  JOIN users AS creator ON creator.id = jobs.created_by
  LEFT JOIN users AS marker ON marker.id = jobs.marked_completed_by
  LEFT JOIN users AS approver ON approver.id = jobs.approved_by
`;

async function getJobOrThrow(jobId) {
  const [rows] = await getPool().query(`${baseJobSelect} WHERE jobs.id = ?`, [jobId]);
  if (!rows.length) {
    throw new ApiError(404, "Job not found.");
  }
  return rows[0];
}

export const createJob = asyncHandler(async (req, res) => {
  const { job_code, title, description, start_date, end_date, created_by } =
    req.body;
  const approvalDocument = req.file
    ? req.file.path.replace(`${process.cwd()}/`, "")
    : null;

  const [duplicates] = await getPool().query(
    "SELECT id FROM jobs WHERE job_code = ? LIMIT 1",
    [job_code]
  );

  if (duplicates.length) {
    throw new ApiError(409, "Job code already exists.");
  }

  const [result] = await getPool().query(
    `INSERT INTO jobs (job_code, title, description, approval_document, created_by, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      job_code,
      title,
      description || null,
      approvalDocument,
      created_by,
      start_date || null,
      end_date || null,
    ]
  );

  await createActivityLog({
    jobId: result.insertId,
    userId: created_by,
    action: "job_created",
    description: `${req.user.full_name} created job "${title}".`,
  });

  const job = await getJobOrThrow(result.insertId);

  res.status(201).json({
    message: "Job created successfully.",
    job,
  });
});

export const listJobs = asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];

  if (req.query.status) {
    filters.push("jobs.status = ?");
    values.push(req.query.status);
  }
  if (req.query.created_by) {
    filters.push("jobs.created_by = ?");
    values.push(req.query.created_by);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await getPool().query(
    `${baseJobSelect} ${whereClause} ORDER BY jobs.id DESC`,
    values
  );

  res.json({ jobs: rows });
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);

  const [contacts] = await getPool().query(
    `SELECT job_contacts.*, contacts.full_name, contacts.phone, contacts.email
     FROM job_contacts
     JOIN contacts ON contacts.id = job_contacts.contact_id
     WHERE job_contacts.job_id = ?`,
    [req.params.id]
  );

  const [attachments] = await getPool().query(
    `SELECT attachments.*, users.full_name AS uploaded_by_name
     FROM attachments
     JOIN users ON users.id = attachments.uploaded_by
     WHERE related_type = 'job' AND related_id = ?`,
    [req.params.id]
  );

  res.json({
    job,
    contacts,
    attachments,
  });
});

export const updateJob = asyncHandler(async (req, res) => {
  const { job_code, title, description, start_date, end_date, status } = req.body;
  await getJobOrThrow(req.params.id);

  const updates = [];
  const values = [];

  if (job_code !== undefined) {
    const [duplicates] = await getPool().query(
      "SELECT id FROM jobs WHERE job_code = ? AND id != ? LIMIT 1",
      [job_code, req.params.id]
    );
    if (duplicates.length) {
      throw new ApiError(409, "Another job already uses this code.");
    }
    updates.push("job_code = ?");
    values.push(job_code);
  }
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description || null);
  }
  if (start_date !== undefined) {
    updates.push("start_date = ?");
    values.push(start_date || null);
  }
  if (end_date !== undefined) {
    updates.push("end_date = ?");
    values.push(end_date || null);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (req.file) {
    updates.push("approval_document = ?");
    values.push(req.file.path.replace(`${process.cwd()}/`, ""));
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid job fields were provided.");
  }

  values.push(req.params.id);

  await getPool().query(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`, values);

  await createActivityLog({
    jobId: Number(req.params.id),
    userId: req.user.id,
    action: "job_updated",
    description: `${req.user.full_name} updated job "${title || req.params.id}".`,
  });

  const job = await getJobOrThrow(req.params.id);
  res.json({ message: "Job updated successfully.", job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const [result] = await getPool().query("DELETE FROM jobs WHERE id = ?", [
    req.params.id,
  ]);
  if (!result.affectedRows) {
    throw new ApiError(404, "Job not found.");
  }
  res.json({ message: "Job deleted successfully." });
});

export const getJobProgress = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);
  const [tasks] = await getPool().query(
    `SELECT tasks.*, assigned_by_user.full_name AS assigned_by_name,
            assigned_to_user.full_name AS assigned_to_name,
            completed_by_user.full_name AS completed_by_name
     FROM tasks
     JOIN users AS assigned_by_user ON assigned_by_user.id = tasks.assigned_by
     JOIN users AS assigned_to_user ON assigned_to_user.id = tasks.assigned_to
     LEFT JOIN users AS completed_by_user ON completed_by_user.id = tasks.completed_by
     WHERE tasks.job_id = ?
     ORDER BY tasks.id DESC`,
    [req.params.id]
  );
  const [reports] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name, tasks.title AS task_title
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     JOIN tasks ON tasks.id = reports.task_id
     WHERE tasks.job_id = ?
     ORDER BY reports.report_date DESC, reports.id DESC`,
    [req.params.id]
  );
  const [mentions] = await getPool().query(
    `SELECT mentions.*, author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN task_daily_reports reports ON reports.id = mentions.report_id
     JOIN tasks ON tasks.id = reports.task_id
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     WHERE tasks.job_id = ?
     ORDER BY mentions.id DESC`,
    [req.params.id]
  );
  const [activityLogs] = await getPool().query(
    `SELECT activity_logs.*, users.full_name AS user_name
     FROM activity_logs
     JOIN users ON users.id = activity_logs.user_id
     WHERE activity_logs.job_id = ?
     ORDER BY activity_logs.id DESC`,
    [req.params.id]
  );

  res.json({ job, tasks, reports, mentions, activityLogs });
});

export const markJobCompleted = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);

  if (!["ongoing", "rejected"].includes(job.status)) {
    throw new ApiError(400, "Only ongoing or rejected jobs can be marked complete.");
  }

  await getPool().query(
    `UPDATE jobs
     SET status = 'completed_pending_approval',
         marked_completed_by = ?,
         marked_completed_at = NOW(),
         completion_note = ?
     WHERE id = ?`,
    [req.user.id, req.body.completion_note || null, req.params.id]
  );

  await createActivityLog({
    jobId: Number(req.params.id),
    userId: req.user.id,
    action: "job_marked_completed",
    description: `${req.user.full_name} marked job "${job.title}" as completed and pending approval.`,
  });

  res.json({ message: "Job marked as completed and awaiting admin approval." });
});

export const approveJobCompletion = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);
  if (job.status !== "completed_pending_approval") {
    throw new ApiError(400, "This job is not waiting for approval.");
  }

  await getPool().query(
    `UPDATE jobs
     SET status = 'completed',
         approved_by = ?,
         approved_at = NOW(),
         approval_comment = ?,
         completed_at = NOW()
     WHERE id = ?`,
    [req.user.id, req.body.approval_comment || null, req.params.id]
  );

  await createActivityLog({
    jobId: Number(req.params.id),
    userId: req.user.id,
    action: "job_approved",
    description: `${req.user.full_name} approved completion for job "${job.title}".`,
  });

  res.json({ message: "Job completion approved successfully." });
});

export const rejectJobCompletion = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);
  if (job.status !== "completed_pending_approval") {
    throw new ApiError(400, "This job is not waiting for approval.");
  }

  const nextStatus = req.body.status || "ongoing";

  await getPool().query(
    `UPDATE jobs
     SET status = ?,
         approved_by = ?,
         approved_at = NOW(),
         approval_comment = ?
     WHERE id = ?`,
    [nextStatus, req.user.id, req.body.approval_comment || null, req.params.id]
  );

  await createActivityLog({
    jobId: Number(req.params.id),
    userId: req.user.id,
    action: "job_rejected",
    description: `${req.user.full_name} rejected completion for job "${job.title}".`,
  });

  res.json({ message: "Job completion rejected successfully." });
});

export const cancelJob = asyncHandler(async (req, res) => {
  const job = await getJobOrThrow(req.params.id);

  await getPool().query(
    `UPDATE jobs SET status = 'cancelled' WHERE id = ?`,
    [req.params.id]
  );

  await createActivityLog({
    jobId: Number(req.params.id),
    userId: req.user.id,
    action: "job_cancelled",
    description: `${req.user.full_name} cancelled job "${job.title}".`,
  });

  res.json({ message: "Job cancelled successfully." });
});
