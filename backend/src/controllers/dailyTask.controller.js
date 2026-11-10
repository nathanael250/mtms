import fs from "fs/promises";
import path from "path";
import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { getTodayYmd } from "../utils/today.js";

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
            users.full_name AS author_name
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

  // Deleting a carried-over copy makes the original available to carry over again.
  if (rows[0].carried_from_id) {
    await getPool().query(
      "UPDATE daily_tasks SET carried_to_id = NULL WHERE id = ? AND carried_to_id = ? AND user_id = ?",
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

// Unfinished planned tasks from earlier days that have not been carried over yet.
export const listUnfinishedTasks = asyncHandler(async (req, res) => {
  const today = getTodayYmd();
  const [tasks] = await getPool().query(
    `SELECT task.*, DATE_FORMAT(task.created_date, '%Y-%m-%d') AS plan_day
     FROM daily_tasks AS task
     WHERE task.user_id = ?
       AND task.parent_task_id IS NULL
       AND task.created_date < ?
       AND task.created_date >= DATE_SUB(?, INTERVAL ${CARRY_OVER_LOOKBACK_DAYS} DAY)
       AND task.carried_to_id IS NULL
       AND ${UNFINISHED_SQL}
     ORDER BY task.created_date DESC, task.sort_order IS NULL, task.sort_order ASC, task.id ASC`,
    [req.user.id, today, today]
  );

  let todos = [];
  if (tasks.length) {
    const [rows] = await getPool().query(
      `SELECT id, parent_task_id, description, is_completed
       FROM daily_tasks WHERE user_id = ? AND parent_task_id IN (?)
       ORDER BY sort_order IS NULL, sort_order ASC, id ASC`,
      [req.user.id, tasks.map((task) => task.id)]
    );
    todos = rows;
  }

  res.json({
    today,
    tasks: tasks.map((task) => ({
      ...task,
      todo_items: todos.filter((todo) => todo.parent_task_id === task.id),
    })),
  });
});

// Continues an unfinished task from an earlier day on today: a new task is created for today
// with only the to-dos that are still open. The old day is left exactly as it was.
export const carryOverDailyTask = asyncHandler(async (req, res) => {
  const today = getTodayYmd();
  const [rows] = await getPool().query(
    `SELECT task.*, ${PLAN_DAY_SQL.replace("created_date", "task.created_date")},
            (${UNFINISHED_SQL}) AS is_unfinished
     FROM daily_tasks AS task
     WHERE task.id = ? AND task.user_id = ? AND task.parent_task_id IS NULL`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }
  const task = rows[0];

  if (task.plan_day >= today) {
    throw new ApiError(400, "Only tasks from earlier days can be carried over.");
  }
  if (task.carried_to_id) {
    throw new ApiError(400, "This task was already carried over.");
  }
  if (!task.is_unfinished) {
    throw new ApiError(400, "This task is already finished, so there is nothing to carry over.");
  }

  const [openTodos] = await getPool().query(
    `SELECT description FROM daily_tasks
     WHERE parent_task_id = ? AND user_id = ? AND is_completed = 0
     ORDER BY sort_order IS NULL, sort_order ASC, id ASC`,
    [task.id, req.user.id]
  );

  const connection = await getPool().getConnection();
  let newId;
  try {
    await connection.beginTransaction();

    // Claim the original first so two quick clicks cannot create two copies.
    const [claim] = await connection.query(
      "UPDATE daily_tasks SET carried_to_id = 0 WHERE id = ? AND carried_to_id IS NULL",
      [task.id]
    );
    if (!claim.affectedRows) {
      throw new ApiError(400, "This task was already carried over.");
    }

    const [created] = await connection.query(
      `INSERT INTO daily_tasks (user_id, description, planned_time, created_date, carried_from_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, task.description, task.planned_time, today, task.id]
    );
    newId = created.insertId;

    for (const todo of openTodos) {
      await connection.query(
        `INSERT INTO daily_tasks (user_id, parent_task_id, description, created_date)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, newId, todo.description, today]
      );
    }

    await connection.query("UPDATE daily_tasks SET carried_to_id = ? WHERE id = ?", [
      newId,
      task.id,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.status(201).json({
    message: "Task carried over to today.",
    task: { id: newId, description: task.description, created_date: today },
  });
});
