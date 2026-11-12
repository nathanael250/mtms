import fs from "fs/promises";
import path from "path";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { getTodayYmd } from "../utils/today.js";
import { sendCommentReplyNotification } from "../services/notification.service.js";

function getRequestedDate(value) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, "Date must use YYYY-MM-DD format.");
  }

  return value;
}

function getRequestedTime(value) {
  if (!value) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new ApiError(400, "Planned time must use HH:MM format.");
  }

  return `${value}:00`;
}

// A day is open for changes when it is today, or when an admin has unlocked it for this employee.
async function isDayEditable(userId, planDay) {
  if (planDay === getTodayYmd()) {
    return true;
  }
  const [rows] = await getPool().query(
    "SELECT 1 FROM daily_day_unlocks WHERE user_id = ? AND plan_date = ? LIMIT 1",
    [userId, planDay]
  );
  return rows.length > 0;
}

export async function assertDayEditable(userId, planDay) {
  if (!(await isDayEditable(userId, planDay))) {
    throw new ApiError(
      403,
      "This day is locked. Planned tasks can only be changed on the day itself, unless your admin unlocks it."
    );
  }
}

const PLAN_DAY_SQL = "DATE_FORMAT(created_date, '%Y-%m-%d') AS plan_day";

async function listDayFiles(userId, date) {
  const [files] = await getPool().query(
    `SELECT id, file_name, file_path, file_type, created_at
     FROM daily_day_report_files
     WHERE user_id = ? AND report_date = ?
     ORDER BY id ASC`,
    [userId, date]
  );
  return files;
}

export const createDailyTask = asyncHandler(async (req, res) => {
  const { description, todo_items = [] } = req.body;
  const createdDate = getRequestedDate(req.body.created_date) || getTodayYmd();
  const plannedTime = getRequestedTime(req.body.planned_time);

  await assertDayEditable(req.user.id, createdDate);

  if (!description || !description.trim()) {
    throw new ApiError(400, "Task description is required.");
  }

  const todoDescriptions = Array.isArray(todo_items)
    ? todo_items.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const connection = await getPool().getConnection();
  let result;

  try {
    await connection.beginTransaction();

    [result] = await connection.query(
      `INSERT INTO daily_tasks (user_id, description, planned_time, created_date)
       VALUES (?, ?, ?, COALESCE(?, CURDATE()))`,
      [req.user.id, description.trim(), plannedTime, createdDate]
    );

    for (const todoDescription of todoDescriptions) {
      await connection.query(
        `INSERT INTO daily_tasks
         (user_id, parent_task_id, description, created_date)
         VALUES (?, ?, ?, COALESCE(?, CURDATE()))`,
        [req.user.id, result.insertId, todoDescription, createdDate]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.status(201).json({
    message: "Daily task created successfully.",
    task: {
      id: result.insertId,
      user_id: req.user.id,
      description: description.trim(),
      planned_time: plannedTime,
      is_completed: 0,
      completed_at: null,
      created_date: createdDate || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      todo_items: todoDescriptions.map((item) => ({
        description: item,
        is_completed: 0,
      })),
    },
  });
});

export const listDailyTasks = asyncHandler(async (req, res) => {
  const date = getRequestedDate(req.query.date) || getTodayYmd();
  if (date === getTodayYmd()) {
    await materializeCarryOvers({ userId: req.user.id });
  }

  const [tasks] = await getPool().query(
    `SELECT daily_tasks.*,
            DATE_FORMAT(source.created_date, '%Y-%m-%d') AS carried_from_date
     FROM daily_tasks
     LEFT JOIN daily_tasks AS source ON source.id = daily_tasks.carried_from_id
     WHERE daily_tasks.user_id = ?
       AND daily_tasks.created_date = ?
       AND daily_tasks.parent_task_id IS NULL
     ORDER BY daily_tasks.sort_order IS NULL, daily_tasks.sort_order ASC, daily_tasks.id ASC`,
    [req.user.id, date]
  );

  const taskIds = tasks.map((task) => task.id);
  let todoItems = [];

  if (taskIds.length) {
    const placeholders = taskIds.map(() => "?").join(", ");
    const [rows] = await getPool().query(
      `SELECT * FROM daily_tasks
       WHERE user_id = ? AND parent_task_id IN (${placeholders})
       ORDER BY sort_order IS NULL, sort_order ASC, id ASC`,
      [req.user.id, ...taskIds]
    );
    todoItems = rows;
  }

  // Help requests (tags of other staff) made from these planned tasks.
  let taskMentions = [];
  if (taskIds.length) {
    const [rows] = await getPool().query(
      `SELECT mentions.id, mentions.daily_task_id, mentions.mentioned_user_id,
              mentions.status, mentions.message, mentions.resolution_message,
              mentions.resolved_at, mentions.created_at,
              tagged.full_name AS mentioned_user_name
       FROM report_mentions AS mentions
       JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
       WHERE mentions.daily_task_id IN (?) AND mentions.mentioned_by = ?
       ORDER BY mentions.id ASC`,
      [taskIds, req.user.id]
    );
    taskMentions = rows;

    if (rows.length) {
      const [files] = await getPool().query(
        `SELECT id, mention_id, stage, file_name, file_path, file_type
         FROM mention_files WHERE mention_id IN (?) ORDER BY id ASC`,
        [rows.map((row) => row.id)]
      );
      taskMentions = rows.map((row) => ({
        ...row,
        files: files.filter((file) => file.mention_id === row.id),
      }));
    }
  }

  const tasksWithTodos = tasks.map((task) => ({
    ...task,
    todo_items: todoItems.filter((item) => item.parent_task_id === task.id),
    mentions: taskMentions.filter((mention) => mention.daily_task_id === task.id),
  }));

  const editable = await isDayEditable(req.user.id, date);

  const [comments] = await getPool().query(
    `SELECT daily_task_comments.id, daily_task_comments.daily_task_id,
            daily_task_comments.message, daily_task_comments.created_at,
            daily_task_comments.author_id, users.full_name AS author_name
     FROM daily_task_comments
     JOIN users ON users.id = daily_task_comments.author_id
     WHERE daily_task_comments.employee_id = ? AND daily_task_comments.plan_date = ?
     ORDER BY daily_task_comments.id ASC`,
    [req.user.id, date]
  );

  const [reports] = await getPool().query(
    `SELECT id, summary, submitted_at, updated_at
     FROM daily_day_reports WHERE user_id = ? AND report_date = ? LIMIT 1`,
    [req.user.id, date]
  );

  res.json({
    date,
    is_today: date === getTodayYmd(),
    is_editable: editable,
    tasks: tasksWithTodos,
    comments,
    day_report: reports[0] || null,
    day_files: await listDayFiles(req.user.id, date),
  });
});

export const updateDailyTask = asyncHandler(async (req, res) => {
  const { description, todo_items } = req.body;
  const plannedTime = getRequestedTime(req.body.planned_time);

  if (!description || !description.trim()) {
    throw new ApiError(400, "Task description is required.");
  }
  if (todo_items !== undefined && !Array.isArray(todo_items)) {
    throw new ApiError(400, "Todo items must be a list.");
  }

  const [rows] = await getPool().query(
    `SELECT *, ${PLAN_DAY_SQL} FROM daily_tasks
     WHERE id = ? AND user_id = ? AND parent_task_id IS NULL`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }
  const task = rows[0];
  await assertDayEditable(req.user.id, task.plan_day);

  const incoming = Array.isArray(todo_items)
    ? todo_items
        .map((item) => ({
          id: item.id ? Number(item.id) : null,
          description: String(item.description || "").trim(),
        }))
        .filter((item) => item.description)
    : null;

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      "UPDATE daily_tasks SET description = ?, planned_time = ? WHERE id = ?",
      [description.trim(), plannedTime, task.id]
    );

    if (incoming) {
      const [existing] = await connection.query(
        "SELECT id FROM daily_tasks WHERE parent_task_id = ? AND user_id = ?",
        [task.id, req.user.id]
      );
      const existingIds = new Set(existing.map((item) => item.id));
      const keepIds = new Set(
        incoming.filter((item) => item.id && existingIds.has(item.id)).map((item) => item.id)
      );

      for (const row of existing) {
        if (!keepIds.has(row.id)) {
          await connection.query("DELETE FROM daily_tasks WHERE id = ?", [row.id]);
        }
      }

      let addedNew = false;
      for (const item of incoming) {
        if (item.id && keepIds.has(item.id)) {
          await connection.query(
            "UPDATE daily_tasks SET description = ? WHERE id = ?",
            [item.description, item.id]
          );
        } else {
          addedNew = true;
          await connection.query(
            `INSERT INTO daily_tasks (user_id, parent_task_id, description, created_date)
             VALUES (?, ?, ?, ?)`,
            [req.user.id, task.id, item.description, task.created_date]
          );
        }
      }

      // New unfinished work reopens a task that was marked complete.
      if (addedNew && task.is_completed) {
        await connection.query(
          "UPDATE daily_tasks SET is_completed = 0, completed_at = NULL WHERE id = ?",
          [task.id]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [[updated]] = await getPool().query("SELECT * FROM daily_tasks WHERE id = ?", [task.id]);
  const [todos] = await getPool().query(
    "SELECT * FROM daily_tasks WHERE parent_task_id = ? AND user_id = ? ORDER BY sort_order IS NULL, sort_order ASC, id ASC",
    [task.id, req.user.id]
  );

  res.json({
    message: "Daily task updated successfully.",
    task: { ...updated, todo_items: todos },
  });
});

export const saveDayReport = asyncHandler(async (req, res) => {
  const date = getRequestedDate(req.body.date) || getTodayYmd();
  const summary = String(req.body.summary || "").trim();

  await assertDayEditable(req.user.id, date);
  if (!summary) {
    throw new ApiError(400, "Please explain how the work was done.");
  }
  if (summary.length > 5000) {
    throw new ApiError(400, "Report is too long (maximum 5000 characters).");
  }

  await getPool().query(
    `INSERT INTO daily_day_reports (user_id, report_date, summary)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE summary = VALUES(summary)`,
    [req.user.id, date, summary]
  );

  const [rows] = await getPool().query(
    `SELECT id, summary, submitted_at, updated_at
     FROM daily_day_reports WHERE user_id = ? AND report_date = ? LIMIT 1`,
    [req.user.id, date]
  );

  // Today stays open until midnight. A day the admin reopened closes again once the report
  // is submitted.
  const [relocked] = await getPool().query(
    "DELETE FROM daily_day_unlocks WHERE user_id = ? AND plan_date = ?",
    [req.user.id, date]
  );
  const closed = relocked.affectedRows > 0;

  res.json({
    message: closed
      ? "Day report submitted. This day is now closed."
      : "Day report saved.",
    day_report: rows[0],
    closed,
  });
});

export const toggleDailyTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  
  const [rows] = await getPool().query(
    `SELECT *, ${PLAN_DAY_SQL} FROM daily_tasks WHERE id = ? AND user_id = ?`,
    [taskId, req.user.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }

  const task = rows[0];
  await assertDayEditable(req.user.id, task.plan_day);
  const newCompleted = !task.is_completed;
  const completedAt = newCompleted ? new Date() : null;

  await getPool().query(
    `UPDATE daily_tasks SET is_completed = ?, completed_at = ?
     WHERE id = ?`,
    [newCompleted ? 1 : 0, completedAt, taskId]
  );

  if (!task.parent_task_id) {
    await getPool().query(
      `UPDATE daily_tasks SET is_completed = ?, completed_at = ?
       WHERE parent_task_id = ? AND user_id = ?`,
      [newCompleted ? 1 : 0, completedAt, taskId, req.user.id]
    );
  }

  res.json({
    message: "Daily task updated successfully.",
    task: {
      ...task,
      is_completed: newCompleted,
      completed_at: completedAt,
    },
  });
});

export const deleteDailyTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;

  const [rows] = await getPool().query(
    `SELECT id, carried_from_id, ${PLAN_DAY_SQL} FROM daily_tasks WHERE id = ? AND user_id = ?`,
    [taskId, req.user.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }
  await assertDayEditable(req.user.id, rows[0].plan_day);

  await getPool().query(
    "DELETE FROM daily_tasks WHERE (id = ? OR parent_task_id = ?) AND user_id = ?",
    [taskId, taskId, req.user.id]
  );

  // Deleting a carried-over copy gives up the carry (it must not come back by itself).
  if (rows[0].carried_from_id) {
    await getPool().query(
      "UPDATE daily_tasks SET carried_to_id = NULL, carry_over = 0 WHERE id = ? AND carried_to_id = ? AND user_id = ?",
      [rows[0].carried_from_id, taskId, req.user.id]
    );
  }

  res.json({ message: "Daily task deleted successfully." });
});

export const uploadDayReportFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A file is required.");
  }

  const date = getRequestedDate(req.body.date) || getTodayYmd();
  try {
    await assertDayEditable(req.user.id, date);
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }

  const relativePath = req.file.path.replace(`${process.cwd()}/`, "");
  const [result] = await getPool().query(
    `INSERT INTO daily_day_report_files (user_id, report_date, file_name, file_path, file_type)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, date, req.file.originalname, relativePath, req.file.mimetype]
  );

  res.status(201).json({
    message: "File attached to your day report.",
    file: {
      id: result.insertId,
      file_name: req.file.originalname,
      file_path: relativePath,
      file_type: req.file.mimetype,
    },
  });
});

export const deleteDayReportFile = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT id, file_path, DATE_FORMAT(report_date, '%Y-%m-%d') AS report_day
     FROM daily_day_report_files WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    throw new ApiError(404, "File not found.");
  }
  await assertDayEditable(req.user.id, rows[0].report_day);

  await getPool().query("DELETE FROM daily_day_report_files WHERE id = ?", [rows[0].id]);
  await fs.unlink(path.resolve(process.cwd(), rows[0].file_path)).catch(() => {});

  res.json({ message: "File removed." });
});

// Saves a new order for planned tasks (or for the to-dos of one task).
// Body: { ids: [id, id, ...] } in the wanted order.
export const reorderDailyTasks = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new ApiError(400, "A list of task ids is required.");
  }
  if (new Set(ids).size !== ids.length) {
    throw new ApiError(400, "Task ids must be unique.");
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await getPool().query(
    `SELECT id, parent_task_id, ${PLAN_DAY_SQL} FROM daily_tasks
     WHERE user_id = ? AND id IN (${placeholders})`,
    [req.user.id, ...ids]
  );
  if (rows.length !== ids.length) {
    throw new ApiError(404, "Some tasks were not found.");
  }

  const sameList = rows.every(
    (row) =>
      row.plan_day === rows[0].plan_day &&
      (row.parent_task_id ?? null) === (rows[0].parent_task_id ?? null)
  );
  if (!sameList) {
    throw new ApiError(400, "Only items from the same list can be reordered together.");
  }
  await assertDayEditable(req.user.id, rows[0].plan_day);

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    for (let index = 0; index < ids.length; index += 1) {
      await connection.query(
        "UPDATE daily_tasks SET sort_order = ? WHERE id = ? AND user_id = ?",
        [index, ids[index], req.user.id]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.json({ message: "Order saved." });
});

// A task is unfinished unless it is ticked, or it has to-dos and every one of them is ticked.
const UNFINISHED_SQL = `
  task.is_completed = 0
  AND NOT (
    EXISTS (SELECT 1 FROM daily_tasks todo WHERE todo.parent_task_id = task.id)
    AND NOT EXISTS (
      SELECT 1 FROM daily_tasks todo WHERE todo.parent_task_id = task.id AND todo.is_completed = 0
    )
  )`;

const CARRY_OVER_LOOKBACK_DAYS = 14;

// Employee marks (or unmarks) an unfinished task to continue on the next day.
// This can only be done while the day is open, so the decision is made on the day itself.
export const setCarryOver = asyncHandler(async (req, res) => {
  const wanted = req.body.carry_over !== false;

  const [rows] = await getPool().query(
    `SELECT task.id, task.carried_to_id, ${PLAN_DAY_SQL.replace("created_date", "task.created_date")},
            (${UNFINISHED_SQL}) AS is_unfinished
     FROM daily_tasks AS task
     WHERE task.id = ? AND task.user_id = ? AND task.parent_task_id IS NULL`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }
  const task = rows[0];

  await assertDayEditable(req.user.id, task.plan_day);
  if (task.carried_to_id) {
    throw new ApiError(400, "This task was already carried over.");
  }
  if (wanted && !task.is_unfinished) {
    throw new ApiError(400, "This task is finished, so there is nothing to carry over.");
  }

  await getPool().query("UPDATE daily_tasks SET carry_over = ? WHERE id = ?", [
    wanted ? 1 : 0,
    task.id,
  ]);

  res.json({
    message: wanted
      ? "This task will continue on the next day."
      : "This task will not be carried over.",
    carry_over: wanted,
  });
});

// Creates today's copy of every task that was marked to continue and is still unfinished.
// The copy holds only the to-dos that are still open; the old day is left untouched.
// Runs whenever plans are loaded, so it works even if nobody opens the page first thing.
export async function materializeCarryOvers({ userId = null } = {}) {
  const today = getTodayYmd();
  const [due] = await getPool().query(
    `SELECT task.id, task.user_id, task.description, task.planned_time,
            (${UNFINISHED_SQL}) AS is_unfinished
     FROM daily_tasks AS task
     WHERE task.parent_task_id IS NULL
       AND task.carry_over = 1
       AND task.carried_to_id IS NULL
       AND task.created_date < ?
       AND task.created_date >= DATE_SUB(?, INTERVAL ${CARRY_OVER_LOOKBACK_DAYS} DAY)
       ${userId ? "AND task.user_id = ?" : ""}`,
    userId ? [today, today, userId] : [today, today]
  );

  for (const task of due) {
    if (!task.is_unfinished) continue;

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();

      // Claim the original first so parallel page loads cannot create two copies.
      const [claim] = await connection.query(
        "UPDATE daily_tasks SET carried_to_id = 0 WHERE id = ? AND carried_to_id IS NULL",
        [task.id]
      );
      if (!claim.affectedRows) {
        await connection.rollback();
        continue;
      }

      const [openTodos] = await connection.query(
        `SELECT description FROM daily_tasks
         WHERE parent_task_id = ? AND is_completed = 0
         ORDER BY sort_order IS NULL, sort_order ASC, id ASC`,
        [task.id]
      );
      const [created] = await connection.query(
        `INSERT INTO daily_tasks (user_id, description, planned_time, created_date, carried_from_id)
         VALUES (?, ?, ?, ?, ?)`,
        [task.user_id, task.description, task.planned_time, today, task.id]
      );
      for (const todo of openTodos) {
        await connection.query(
          `INSERT INTO daily_tasks (user_id, parent_task_id, description, created_date)
           VALUES (?, ?, ?, ?)`,
          [task.user_id, created.insertId, todo.description, today]
        );
      }
      await connection.query("UPDATE daily_tasks SET carried_to_id = ? WHERE id = ?", [
        created.insertId,
        task.id,
      ]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Carry-over failed for task ${task.id}:`, error.message);
    } finally {
      connection.release();
    }
  }
}

// A staff member replies to what an admin wrote on their plan. The reply is stored in
// the same thread (a comment on the same task, or on the same day) and the person who
// wrote the latest comment there is told on WhatsApp. Body: { daily_task_id | date, message }.
// Replying is allowed on any day; the day lock only applies to editing the plan.
export const replyToComment = asyncHandler(async (req, res) => {
  const pool = getPool();
  const message = String(req.body.message || "").trim();
  if (!message) {
    throw new ApiError(400, "Reply cannot be empty.");
  }
  if (message.length > 1000) {
    throw new ApiError(400, "Reply is too long (maximum 1000 characters).");
  }

  let taskId = null;
  let taskDescription = null;
  let planDate;

  if (req.body.daily_task_id) {
    const [tasks] = await pool.query(
      `SELECT id, description, DATE_FORMAT(created_date, '%Y-%m-%d') AS created_date
       FROM daily_tasks WHERE id = ? AND user_id = ? AND parent_task_id IS NULL`,
      [req.body.daily_task_id, req.user.id]
    );
    if (!tasks.length) {
      throw new ApiError(404, "Planned task not found.");
    }
    taskId = tasks[0].id;
    taskDescription = tasks[0].description;
    planDate = tasks[0].created_date;
  } else {
    planDate = getRequestedDate(req.body.date) || getTodayYmd();
  }

  // Who are we answering? The latest comment by someone else in this same thread.
  const [previous] = await pool.query(
    `SELECT author_id FROM daily_task_comments
     WHERE employee_id = ? AND author_id <> ? AND plan_date = ?
       AND ${taskId ? "daily_task_id = ?" : "daily_task_id IS NULL"}
     ORDER BY id DESC LIMIT 1`,
    taskId ? [req.user.id, req.user.id, planDate, taskId] : [req.user.id, req.user.id, planDate]
  );
  if (!previous.length) {
    throw new ApiError(400, "There is no comment to reply to here.");
  }

  const [result] = await pool.query(
    `INSERT INTO daily_task_comments (employee_id, daily_task_id, plan_date, author_id, message)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, taskId, planDate, req.user.id, message]
  );

  let whatsappStatus;
  try {
    const [recipients] = await pool.query(
      "SELECT id, full_name, phone FROM users WHERE id = ? AND status = 'active' LIMIT 1",
      [previous[0].author_id]
    );
    whatsappStatus = recipients.length
      ? await sendCommentReplyNotification({
          recipient: recipients[0],
          replierName: req.user.full_name,
          planDate,
          taskDescription,
          message,
        })
      : "no_phone";
  } catch (error) {
    console.error(`Comment reply WhatsApp failed for comment ${result.insertId}:`, error.message);
    whatsappStatus = "failed";
  }
  await pool.query("UPDATE daily_task_comments SET whatsapp_status = ? WHERE id = ?", [
    whatsappStatus,
    result.insertId,
  ]);

  res.status(201).json({
    message: "Reply sent.",
    comment: {
      id: result.insertId,
      daily_task_id: taskId,
      message,
      author_id: req.user.id,
      author_name: req.user.full_name,
      created_at: new Date().toISOString(),
    },
  });
});

// Every conversation on the signed-in person's plans that someone else started, newest
// first. A conversation is the comments on one planned task, or the comments on one day.
// `needs_reply` is true while the latest message in it came from somebody else.
export const listMyCommentThreads = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT c.id, c.daily_task_id, DATE_FORMAT(c.plan_date, '%Y-%m-%d') AS plan_date,
            c.message, c.created_at, c.author_id, author.full_name AS author_name,
            t.description AS task_description
     FROM daily_task_comments AS c
     JOIN users AS author ON author.id = c.author_id
     LEFT JOIN daily_tasks AS t ON t.id = c.daily_task_id
     WHERE c.employee_id = ?
     ORDER BY c.id ASC`,
    [req.user.id]
  );

  const threads = new Map();
  for (const row of rows) {
    const key = row.daily_task_id ? `task-${row.daily_task_id}` : `day-${row.plan_date}`;
    if (!threads.has(key)) {
      threads.set(key, {
        key,
        daily_task_id: row.daily_task_id,
        plan_date: row.plan_date,
        task_description: row.task_description,
        messages: [],
      });
    }
    threads.get(key).messages.push({
      id: row.id,
      message: row.message,
      created_at: row.created_at,
      author_id: row.author_id,
      author_name: row.author_name,
    });
  }

  const list = [...threads.values()]
    .filter((thread) => thread.messages.some((m) => m.author_id !== req.user.id))
    .map((thread) => {
      const last = thread.messages[thread.messages.length - 1];
      return { ...thread, last_at: last.created_at, needs_reply: last.author_id !== req.user.id };
    })
    .sort((x, y) => new Date(y.last_at) - new Date(x.last_at));

  res.json({
    threads: list,
    needs_reply_count: list.filter((thread) => thread.needs_reply).length,
  });
});
