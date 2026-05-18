import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

async function getTaskOrThrow(taskId) {
  const [rows] = await getPool().query(
    `SELECT tasks.*, jobs.title AS job_title,
            assigned_by_user.full_name AS assigned_by_name,
            assigned_to_user.full_name AS assigned_to_name,
            completed_by_user.full_name AS completed_by_name
     FROM tasks
     JOIN jobs ON jobs.id = tasks.job_id
     JOIN users AS assigned_by_user ON assigned_by_user.id = tasks.assigned_by
     JOIN users AS assigned_to_user ON assigned_to_user.id = tasks.assigned_to
     LEFT JOIN users AS completed_by_user ON completed_by_user.id = tasks.completed_by
     WHERE tasks.id = ?`,
    [taskId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Task not found.");
  }

  return rows[0];
}

export const createTask = asyncHandler(async (req, res) => {
  const {
    job_id,
    parent_task_id,
    title,
    description,
    assigned_by,
    assigned_to,
    start_date,
    due_date,
  } = req.body;

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [jobRows] = await connection.query(
      "SELECT id, status, title FROM jobs WHERE id = ? LIMIT 1",
      [job_id]
    );
    if (!jobRows.length) {
      throw new ApiError(404, "Job not found.");
    }

    if (parent_task_id) {
      const [parentRows] = await connection.query(
        "SELECT id FROM tasks WHERE id = ? LIMIT 1",
        [parent_task_id]
      );
      if (!parentRows.length) {
        throw new ApiError(404, "Parent task not found.");
      }
    }

    const [result] = await connection.query(
      `INSERT INTO tasks (job_id, parent_task_id, title, description, assigned_by, assigned_to, start_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_id,
        parent_task_id || null,
        title,
        description || null,
        assigned_by,
        assigned_to,
        start_date || null,
        due_date || null,
      ]
    );

    if (jobRows[0].status === "pending") {
      await connection.query(
        "UPDATE jobs SET status = 'ongoing' WHERE id = ?",
        [job_id]
      );
    }

    await createActivityLog(
      {
        jobId: job_id,
        taskId: result.insertId,
        userId: assigned_by,
        action: "task_assigned",
        description: `${req.user.full_name} assigned task "${title}".`,
      },
      connection
    );

    await connection.commit();
    const task = await getTaskOrThrow(result.insertId);
    res.status(201).json({ message: "Task created successfully.", task });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const listTasks = asyncHandler(async (req, res) => {
  const conditions = [];
  const values = [];

  if (req.query.assigned_to) {
    conditions.push("tasks.assigned_to = ?");
    values.push(req.query.assigned_to);
  }
  if (req.query.job_id) {
    conditions.push("tasks.job_id = ?");
    values.push(req.query.job_id);
  }
  if (req.query.status) {
    conditions.push("tasks.status = ?");
    values.push(req.query.status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT tasks.*, jobs.title AS job_title,
            assigned_by_user.full_name AS assigned_by_name,
            assigned_to_user.full_name AS assigned_to_name
     FROM tasks
     JOIN jobs ON jobs.id = tasks.job_id
     JOIN users AS assigned_by_user ON assigned_by_user.id = tasks.assigned_by
     JOIN users AS assigned_to_user ON assigned_to_user.id = tasks.assigned_to
     ${whereClause}
     ORDER BY tasks.id DESC`,
    values
  );

  res.json({ tasks: rows });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await getTaskOrThrow(req.params.id);
  const [reports] = await getPool().query(
    `SELECT reports.*, users.full_name AS user_name
     FROM task_daily_reports AS reports
     JOIN users ON users.id = reports.user_id
     WHERE reports.task_id = ?
     ORDER BY reports.report_date DESC, reports.id DESC`,
    [req.params.id]
  );
  const [subTasks] = await getPool().query(
    `SELECT id, title, status, assigned_to
     FROM tasks
     WHERE parent_task_id = ?
     ORDER BY id DESC`,
    [req.params.id]
  );
  const [attachments] = await getPool().query(
    `SELECT attachments.*, users.full_name AS uploaded_by_name
     FROM attachments
     JOIN users ON users.id = attachments.uploaded_by
     WHERE related_type = 'task' AND related_id = ?`,
    [req.params.id]
  );

  res.json({ task, reports, subTasks, attachments });
});

export const updateTask = asyncHandler(async (req, res) => {
  const { title, description, assigned_to, status, start_date, due_date } =
    req.body;
  await getTaskOrThrow(req.params.id);

  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description || null);
  }
  if (assigned_to !== undefined) {
    updates.push("assigned_to = ?");
    values.push(assigned_to);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (start_date !== undefined) {
    updates.push("start_date = ?");
    values.push(start_date || null);
  }
  if (due_date !== undefined) {
    updates.push("due_date = ?");
    values.push(due_date || null);
  }

  if (!updates.length) {
    throw new ApiError(400, "No valid task fields were provided.");
  }

  values.push(req.params.id);
  await getPool().query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, values);
  const task = await getTaskOrThrow(req.params.id);
  res.json({ message: "Task updated successfully.", task });
});

export const startTask = asyncHandler(async (req, res) => {
  const task = await getTaskOrThrow(req.params.id);
  if (req.user.role !== "admin" && task.assigned_to !== req.user.id) {
    throw new ApiError(403, "Only the assigned user can start this task.");
  }

  await getPool().query(
    `UPDATE tasks
     SET status = 'ongoing', start_date = COALESCE(start_date, CURDATE())
     WHERE id = ?`,
    [req.params.id]
  );

  await createActivityLog({
    jobId: task.job_id,
    taskId: task.id,
    userId: req.user.id,
    action: "task_started",
    description: `${req.user.full_name} started task "${task.title}".`,
  });

  res.json({ message: "Task started successfully." });
});

export const completeTask = asyncHandler(async (req, res) => {
  const task = await getTaskOrThrow(req.params.id);
  if (req.user.role !== "admin" && task.assigned_to !== req.user.id) {
    throw new ApiError(403, "Only the assigned user can complete this task.");
  }

  await getPool().query(
    `UPDATE tasks
     SET status = 'completed',
         completed_by = ?,
         completed_at = NOW(),
         completion_note = ?
     WHERE id = ?`,
    [req.user.id, req.body.completion_note || null, req.params.id]
  );

  await createActivityLog({
    jobId: task.job_id,
    taskId: task.id,
    userId: req.user.id,
    action: "task_completed",
    description: `${req.user.full_name} completed task "${task.title}".`,
  });

  res.json({ message: "Task completed successfully." });
});

