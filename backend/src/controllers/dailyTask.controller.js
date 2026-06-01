import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

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

export const createDailyTask = asyncHandler(async (req, res) => {
  const { description, todo_items = [] } = req.body;
  const createdDate = getRequestedDate(req.body.created_date);
  const plannedTime = getRequestedTime(req.body.planned_time);

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
  const requestedDate = getRequestedDate(req.query.date);

  const [tasks] = await getPool().query(
    `SELECT * FROM daily_tasks
     WHERE user_id = ?
       AND created_date = COALESCE(?, CURDATE())
       AND parent_task_id IS NULL
     ORDER BY id ASC`,
    [req.user.id, requestedDate]
  );

  const taskIds = tasks.map((task) => task.id);
  let todoItems = [];

  if (taskIds.length) {
    const placeholders = taskIds.map(() => "?").join(", ");
    const [rows] = await getPool().query(
      `SELECT * FROM daily_tasks
       WHERE user_id = ? AND parent_task_id IN (${placeholders})
       ORDER BY id ASC`,
      [req.user.id, ...taskIds]
    );
    todoItems = rows;
  }

  const tasksWithTodos = tasks.map((task) => ({
    ...task,
    todo_items: todoItems.filter((item) => item.parent_task_id === task.id),
  }));

  res.json({
    date: requestedDate || new Date().toISOString().split("T")[0],
    tasks: tasksWithTodos,
  });
});

export const toggleDailyTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  
  const [rows] = await getPool().query(
    "SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?",
    [taskId, req.user.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }

  const task = rows[0];
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
    "SELECT id FROM daily_tasks WHERE id = ? AND user_id = ?",
    [taskId, req.user.id]
  );

  if (!rows.length) {
    throw new ApiError(404, "Daily task not found.");
  }

  await getPool().query(
    "DELETE FROM daily_tasks WHERE (id = ? OR parent_task_id = ?) AND user_id = ?",
    [taskId, taskId, req.user.id]
  );

  res.json({ message: "Daily task deleted successfully." });
});
