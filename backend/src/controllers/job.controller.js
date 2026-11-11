import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { sendJobNotifyNotification } from "../services/notification.service.js";
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

function relativePath(file) {
  return file.path.replace(`${process.cwd()}/`, "");
}

function collectUploadedFiles(req) {
  const grouped = req.files || {};
  return [...(grouped.files || []), ...(grouped.file || [])];
}

// The first document stays in jobs.approval_document; extra ones become attachments.
async function saveExtraDocuments(jobId, files, userId) {
  for (const file of files) {
    await getPool().query(
      `INSERT INTO attachments (related_type, related_id, file_name, file_path, file_type, uploaded_by)
       VALUES ('job', ?, ?, ?, ?, ?)`,
      [jobId, file.originalname.slice(0, 255), relativePath(file), file.mimetype, userId]
    );
  }
}

// `notifications` arrives as a JSON string (multipart form): [{ user_id, message }].
function parseNotifications(value) {
  let list = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      throw new ApiError(400, "Invalid notification list.");
    }
  }
  if (!Array.isArray(list)) return [];
  const byUser = new Map();
  for (const item of list) {
    const id = Number(item?.user_id);
    const message = String(item?.message || "").trim();
    if (!Number.isInteger(id) || id < 1) continue;
    if (!message) {
      throw new ApiError(400, "Each notified staff member needs a message.");
    }
    byUser.set(id, message.slice(0, 1000));
  }
  return [...byUser].map(([user_id, message]) => ({ user_id, message }));
}

async function notifyStaffAboutJob(job, notifications, authorName) {
  const summary = { sent: 0, failed: 0, no_phone: 0, disabled: 0 };
  if (!notifications.length) return summary;

  const [recipients] = await getPool().query(
    `SELECT users.id, users.full_name, users.phone
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE users.id IN (?) AND users.status = 'active'
       AND roles.name = 'admin' AND users.can_receive_help = 1`,
    [notifications.map((item) => item.user_id)]
  );
  const messageFor = new Map(notifications.map((item) => [item.user_id, item.message]));
  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendJobNotifyNotification({
        recipient,
        job,
        authorName,
        message: messageFor.get(recipient.id),
      })
    )
  );
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      summary[result.value] += 1;
    } else {
      summary.failed += 1;
      console.error(
        `Job notify failed for user ${recipients[index].id}:`,
        result.reason?.message || result.reason
      );
    }
  });
  return summary;
}

async function generateJobCode() {
  const prefix = `JOB-${new Date().getFullYear()}-`;
  const [rows] = await getPool().query(
    `SELECT MAX(CAST(SUBSTRING(job_code, ?) AS UNSIGNED)) AS last_number
     FROM jobs WHERE job_code LIKE ?`,
    [prefix.length + 1, `${prefix}%`]
  );
  const next = (rows[0].last_number || 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export const createJob = asyncHandler(async (req, res) => {
  const { title, description, start_date, end_date, created_by } = req.body;
  const notifications = parseNotifications(req.body.notifications);
  const uploadedFiles = collectUploadedFiles(req);
  const approvalDocument = uploadedFiles.length ? relativePath(uploadedFiles[0]) : null;

  let result;
  for (let attempt = 1; ; attempt += 1) {
    const jobCode = await generateJobCode();
    try {
      [result] = await getPool().query(
        `INSERT INTO jobs (job_code, title, description, approval_document, created_by, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          jobCode,
          title,
          description || null,
          approvalDocument,
          created_by,
          start_date || null,
          end_date || null,
        ]
      );
      break;
    } catch (error) {
      // Two jobs created at the same moment can pick the same number; retry.
      if (error.code !== "ER_DUP_ENTRY" || attempt >= 5) throw error;
    }
  }

  await saveExtraDocuments(result.insertId, uploadedFiles.slice(1), req.user.id);

  await createActivityLog({
    jobId: result.insertId,
    userId: created_by,
    action: "job_created",
    description: `${req.user.full_name} created job "${title}".`,
  });

  const job = await getJobOrThrow(result.insertId);
  const notified = await notifyStaffAboutJob(
    job,
    notifications,
    req.user.full_name
  );

  res.status(201).json({
    message: "Job created successfully.",
    job,
    notified,
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
  const existingJob = await getJobOrThrow(req.params.id);
  const uploadedFiles = collectUploadedFiles(req);

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
  let extraFiles = uploadedFiles;
  if (uploadedFiles.length && !existingJob.approval_document) {
    updates.push("approval_document = ?");
    values.push(relativePath(uploadedFiles[0]));
    extraFiles = uploadedFiles.slice(1);
  }

  if (!updates.length && !extraFiles.length) {
    throw new ApiError(400, "No valid job fields were provided.");
  }

  values.push(req.params.id);

  if (updates.length) {
    await getPool().query(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`, values);
  }
  await saveExtraDocuments(Number(req.params.id), extraFiles, req.user.id);

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
