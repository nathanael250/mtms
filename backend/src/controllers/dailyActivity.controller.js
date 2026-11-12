import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { getTodayYmd } from "../utils/today.js";
import { materializeCarryOvers } from "./dailyTask.controller.js";
import {
  sendBroadcastNotification,
  sendPlanCommentNotification,
} from "../services/notification.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toYmd(date) {
  return date.toISOString().split("T")[0];
}

function parseYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, "Dates must use YYYY-MM-DD format.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date.");
  }
  return date;
}

// Defaults to the last 7 days ending today.
function getRange(query) {
  const to = query.to ? parseYmd(query.to) : parseYmd(toYmd(new Date()));
  const from = query.from ? parseYmd(query.from) : new Date(to.getTime() - 6 * DAY_MS);

  if (from > to) {
    throw new ApiError(400, "Start date must not be after end date.");
  }
  if ((to - from) / DAY_MS > 366) {
    throw new ApiError(400, "Date range cannot exceed one year.");
  }

  return { from: toYmd(from), to: toYmd(to), fromDate: from, toDate: to };
}

function countWorkingDays(fromDate, toDate) {
  let count = 0;
  for (let time = fromDate.getTime(); time <= toDate.getTime(); time += DAY_MS) {
    const day = new Date(time).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function percent(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export const getActivityOverview = asyncHandler(async (req, res) => {
  await materializeCarryOvers();
  const { from, to, fromDate, toDate } = getRange(req.query);
  const pool = getPool();

  const [staff] = await pool.query(
    `SELECT users.id, users.full_name, users.email
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE roles.name = 'staff' AND users.status = 'active'
     ORDER BY users.full_name ASC`
  );

  // A planned task counts as done when it is ticked itself or all of its to-dos are ticked.
  const [planRows] = await pool.query(
    `SELECT plans.user_id,
            COUNT(*) AS planned,
            SUM(plans.is_done) AS completed,
            SUM(plans.is_done AND DATE(plans.done_at) > plans.created_date) AS completed_late,
            COUNT(DISTINCT plans.created_date) AS days_planned,
            DATE_FORMAT(MAX(plans.created_date), '%Y-%m-%d') AS last_planned_date
     FROM (
       SELECT task.user_id, task.created_date,
              (task.is_completed = 1 OR (
                 EXISTS (SELECT 1 FROM daily_tasks todo WHERE todo.parent_task_id = task.id)
                 AND NOT EXISTS (
                   SELECT 1 FROM daily_tasks todo
                   WHERE todo.parent_task_id = task.id AND todo.is_completed = 0
                 )
              )) AS is_done,
              COALESCE(
                task.completed_at,
                (SELECT MAX(todo.completed_at) FROM daily_tasks todo
                 WHERE todo.parent_task_id = task.id)
              ) AS done_at
       FROM daily_tasks task
       WHERE task.parent_task_id IS NULL AND task.created_date BETWEEN ? AND ?
     ) AS plans
     GROUP BY plans.user_id`,
    [from, to]
  );

  const [todoRows] = await pool.query(
    `SELECT user_id, COUNT(*) AS todo_total, SUM(is_completed = 1) AS todo_done
     FROM daily_tasks
     WHERE parent_task_id IS NOT NULL AND created_date BETWEEN ? AND ?
     GROUP BY user_id`,
    [from, to]
  );

  const [reportRows] = await pool.query(
    `SELECT user_id, COUNT(*) AS reports_submitted
     FROM task_daily_reports
     WHERE report_date BETWEEN ? AND ?
     GROUP BY user_id`,
    [from, to]
  );

  const [jobTaskRows] = await pool.query(
    `SELECT assigned_to AS user_id,
            SUM(status IN ('assigned', 'ongoing')) AS job_tasks_active,
            SUM(status = 'completed' AND DATE(completed_at) BETWEEN ? AND ?)
              AS job_tasks_completed
     FROM tasks
     GROUP BY assigned_to`,
    [from, to]
  );

  const plans = new Map(planRows.map((row) => [row.user_id, row]));
  const todos = new Map(todoRows.map((row) => [row.user_id, row]));
  const reports = new Map(reportRows.map((row) => [row.user_id, row]));
  const jobTasks = new Map(jobTaskRows.map((row) => [row.user_id, row]));
  const workingDays = countWorkingDays(fromDate, toDate);

  const employees = staff.map((person) => {
    const plan = plans.get(person.id);
    const planned = Number(plan?.planned || 0);
    const completed = Number(plan?.completed || 0);
    const daysPlanned = Number(plan?.days_planned || 0);

    return {
      id: person.id,
      full_name: person.full_name,
      email: person.email,
      planned,
      completed,
      completed_late: Number(plan?.completed_late || 0),
      completion_rate: percent(completed, planned),
      todo_total: Number(todos.get(person.id)?.todo_total || 0),
      todo_done: Number(todos.get(person.id)?.todo_done || 0),
      days_planned: daysPlanned,
      activity_rate: Math.min(100, percent(daysPlanned, workingDays)),
      last_planned_date: plan?.last_planned_date || null,
      reports_submitted: Number(reports.get(person.id)?.reports_submitted || 0),
      job_tasks_active: Number(jobTasks.get(person.id)?.job_tasks_active || 0),
      job_tasks_completed: Number(jobTasks.get(person.id)?.job_tasks_completed || 0),
    };
  });

  const totals = employees.reduce(
    (sum, item) => ({
      planned: sum.planned + item.planned,
      completed: sum.completed + item.completed,
      reports_submitted: sum.reports_submitted + item.reports_submitted,
      no_activity: sum.no_activity + (item.days_planned === 0 ? 1 : 0),
    }),
    { planned: 0, completed: 0, reports_submitted: 0, no_activity: 0 }
  );

  res.json({
    from,
    to,
    working_days: workingDays,
    totals: { ...totals, completion_rate: percent(totals.completed, totals.planned) },
    employees,
  });
});

export const getEmployeeActivity = asyncHandler(async (req, res) => {
  await materializeCarryOvers({ userId: Number(req.params.userId) });
  const { from, to } = getRange(req.query);
  const pool = getPool();

  const [users] = await pool.query(
    `SELECT users.id, users.full_name, users.email, users.phone, roles.name AS role
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE users.id = ? LIMIT 1`,
    [req.params.userId]
  );
  if (!users.length) {
    throw new ApiError(404, "Employee not found.");
  }

  const [rows] = await pool.query(
    `SELECT id, parent_task_id, description, planned_time, is_completed,
            completed_at, DATE_FORMAT(created_date, '%Y-%m-%d') AS created_date
     FROM daily_tasks
     WHERE user_id = ? AND created_date BETWEEN ? AND ?
     ORDER BY created_date DESC, sort_order IS NULL, sort_order ASC, id ASC`,
    [req.params.userId, from, to]
  );

  const [comments] = await pool.query(
    `SELECT daily_task_comments.id, daily_task_comments.daily_task_id,
            DATE_FORMAT(daily_task_comments.plan_date, '%Y-%m-%d') AS plan_date,
            daily_task_comments.message, daily_task_comments.whatsapp_status,
            daily_task_comments.created_at, daily_task_comments.author_id,
            users.full_name AS author_name
     FROM daily_task_comments
     JOIN users ON users.id = daily_task_comments.author_id
     WHERE daily_task_comments.employee_id = ?
       AND daily_task_comments.plan_date BETWEEN ? AND ?
     ORDER BY daily_task_comments.id ASC`,
    [req.params.userId, from, to]
  );

  const [dayReports] = await pool.query(
    `SELECT DATE_FORMAT(report_date, '%Y-%m-%d') AS report_date,
            summary, submitted_at, updated_at
     FROM daily_day_reports
     WHERE user_id = ? AND report_date BETWEEN ? AND ?`,
    [req.params.userId, from, to]
  );

  const [unlocks] = await pool.query(
    `SELECT DATE_FORMAT(plan_date, '%Y-%m-%d') AS plan_date
     FROM daily_day_unlocks WHERE user_id = ? ORDER BY plan_date DESC`,
    [req.params.userId]
  );
  const unlockedDates = new Set(unlocks.map((row) => row.plan_date));

  const [dayFiles] = await pool.query(
    `SELECT id, DATE_FORMAT(report_date, '%Y-%m-%d') AS report_date,
            file_name, file_path, file_type, created_at
     FROM daily_day_report_files
     WHERE user_id = ? AND report_date BETWEEN ? AND ?
     ORDER BY id ASC`,
    [req.params.userId, from, to]
  );

  const todosByParent = new Map();
  rows
    .filter((row) => row.parent_task_id)
    .forEach((row) => {
      const list = todosByParent.get(row.parent_task_id) || [];
      list.push(row);
      todosByParent.set(row.parent_task_id, list);
    });

  const days = new Map();
  const getDay = (date) => {
    if (!days.has(date)) {
      days.set(date, {
        date,
        tasks: [],
        day_comments: [],
        day_report: null,
        files: [],
        unlocked: unlockedDates.has(date),
      });
    }
    return days.get(date);
  };

  rows
    .filter((row) => !row.parent_task_id)
    .forEach((row) => {
      const todoItems = todosByParent.get(row.id) || [];
      const isDone =
        Boolean(row.is_completed) ||
        (todoItems.length > 0 && todoItems.every((item) => item.is_completed));
      getDay(row.created_date).tasks.push({
        ...row,
        is_done: isDone,
        todo_items: todoItems,
        comments: comments.filter((comment) => comment.daily_task_id === row.id),
      });
    });

  comments
    .filter((comment) => !comment.daily_task_id)
    .forEach((comment) => getDay(comment.plan_date).day_comments.push(comment));
  dayReports.forEach((report) => {
    getDay(report.report_date).day_report = report;
  });
  dayFiles.forEach((file) => getDay(file.report_date).files.push(file));

  // An unlocked day is shown even when it has no entries yet.
  unlockedDates.forEach((date) => {
    if (date >= from && date <= to) getDay(date);
  });

  const [reports] = await pool.query(
    `SELECT task_daily_reports.id,
            DATE_FORMAT(report_date, '%Y-%m-%d') AS report_date,
            activity_done, tasks.title AS task_title, jobs.title AS job_title
     FROM task_daily_reports
     JOIN tasks ON tasks.id = task_daily_reports.task_id
     JOIN jobs ON jobs.id = tasks.job_id
     WHERE task_daily_reports.user_id = ? AND report_date BETWEEN ? AND ?
     ORDER BY report_date DESC, task_daily_reports.id DESC
     LIMIT 100`,
    [req.params.userId, from, to]
  );

  res.json({
    from,
    to,
    employee: users[0],
    unlocked_days: [...unlockedDates],
    today: getTodayYmd(),
    days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)),
    reports,
  });
});

export const addEmployeeComment = asyncHandler(async (req, res) => {
  const pool = getPool();
  const message = String(req.body.message || "").trim();

  if (!message) {
    throw new ApiError(400, "Comment cannot be empty.");
  }
  if (message.length > 1000) {
    throw new ApiError(400, "Comment is too long (maximum 1000 characters).");
  }

  const [users] = await pool.query(
    "SELECT id, full_name, phone FROM users WHERE id = ? LIMIT 1",
    [req.params.userId]
  );
  if (!users.length) {
    throw new ApiError(404, "Employee not found.");
  }
  const employee = users[0];

  let planDate;
  let taskId = null;
  let taskDescription = null;

  if (req.body.daily_task_id) {
    const [tasks] = await pool.query(
      `SELECT id, description, DATE_FORMAT(created_date, '%Y-%m-%d') AS created_date
       FROM daily_tasks WHERE id = ? AND user_id = ? AND parent_task_id IS NULL`,
      [req.body.daily_task_id, employee.id]
    );
    if (!tasks.length) {
      throw new ApiError(404, "Planned task not found for this employee.");
    }
    taskId = tasks[0].id;
    taskDescription = tasks[0].description;
    planDate = tasks[0].created_date;
  } else {
    planDate = req.body.date
      ? toYmd(parseYmd(String(req.body.date)))
      : getTodayYmd();
  }

  const [result] = await pool.query(
    `INSERT INTO daily_task_comments (employee_id, daily_task_id, plan_date, author_id, message)
     VALUES (?, ?, ?, ?, ?)`,
    [employee.id, taskId, planDate, req.user.id, message]
  );

  let whatsappStatus;
  try {
    whatsappStatus = await sendPlanCommentNotification({
      employee,
      authorName: req.user.full_name,
      planDate,
      taskDescription,
      message,
      direct: req.body.direct === true,
    });
  } catch (error) {
    console.error(`Plan comment WhatsApp failed for user ${employee.id}:`, error.message);
    whatsappStatus = "failed";
  }

  await pool.query("UPDATE daily_task_comments SET whatsapp_status = ? WHERE id = ?", [
    whatsappStatus,
    result.insertId,
  ]);

  const [rows] = await pool.query(
    `SELECT daily_task_comments.id, daily_task_comments.daily_task_id,
            DATE_FORMAT(daily_task_comments.plan_date, '%Y-%m-%d') AS plan_date,
            daily_task_comments.message, daily_task_comments.whatsapp_status,
            daily_task_comments.created_at, daily_task_comments.author_id,
            users.full_name AS author_name
     FROM daily_task_comments
     JOIN users ON users.id = daily_task_comments.author_id
     WHERE daily_task_comments.id = ?`,
    [result.insertId]
  );

  res.status(201).json({ message: "Comment saved.", comment: rows[0] });
});

export const deleteEmployeeComment = asyncHandler(async (req, res) => {
  const [result] = await getPool().query("DELETE FROM daily_task_comments WHERE id = ?", [
    req.params.id,
  ]);
  if (!result.affectedRows) {
    throw new ApiError(404, "Comment not found.");
  }
  res.json({ message: "Comment deleted." });
});

const BROADCAST_AUDIENCES = ["all", "not_planned", "planned"];
const BROADCAST_DELAY_MS = 600;
const BROADCAST_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

// Remembers recent broadcasts so the same message is not sent twice by accident
// (for example when the page showed an error and the admin pressed Send again).
const recentBroadcasts = new Map();

function broadcastKey(adminId, audience, from, to, message) {
  return [adminId, audience, from, to, message].join("|");
}

async function deliverBroadcast({ targets, authorName, message, key }) {
  let sent = 0;
  for (const person of targets) {
    if (!person.phone) continue;
    try {
      const status = await sendBroadcastNotification({
        employee: person,
        authorName,
        message,
      });
      if (status === "sent") sent += 1;
    } catch (error) {
      console.error(`Broadcast WhatsApp failed for user ${person.id}:`, error.message);
    }
    // Small pause so WhatsApp does not see a burst of messages.
    await new Promise((resolve) => setTimeout(resolve, BROADCAST_DELAY_MS));
  }
  console.log(`Broadcast finished: ${sent} of ${targets.length} delivered.`);
  // Nothing was delivered (for example the WhatsApp limit): allow trying again.
  if (!sent) recentBroadcasts.delete(key);
}

// Sends one WhatsApp message to a group of staff: everyone, only those who have
// not planned in the date range, or only those who have. Body: { audience,
// message, from, to, dry_run }. With dry_run it only lists who would receive it.
export const broadcastMessage = asyncHandler(async (req, res) => {
  const audience = String(req.body.audience || "");
  const message = String(req.body.message || "").trim();
  const dryRun = req.body.dry_run === true;

  if (!BROADCAST_AUDIENCES.includes(audience)) {
    throw new ApiError(400, "Choose who should receive the message.");
  }
  if (!dryRun) {
    if (!message) {
      throw new ApiError(400, "Message cannot be empty.");
    }
    if (message.length > 1000) {
      throw new ApiError(400, "Message is too long (maximum 1000 characters).");
    }
  }

  const { from, to } = getRange({ from: req.body.from, to: req.body.to });

  const [staff] = await getPool().query(
    `SELECT users.id, users.full_name, users.phone,
            EXISTS (
              SELECT 1 FROM daily_tasks
              WHERE daily_tasks.user_id = users.id
                AND daily_tasks.parent_task_id IS NULL
                AND daily_tasks.created_date BETWEEN ? AND ?
            ) AS has_plan
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE roles.name = 'staff' AND users.status = 'active'
     ORDER BY users.full_name ASC`,
    [from, to]
  );

  const targets = staff.filter((person) =>
    audience === "all"
      ? true
      : audience === "planned"
        ? Boolean(person.has_plan)
        : !person.has_plan
  );

  if (dryRun) {
    res.json({
      audience,
      recipients: targets.map((person) => ({
        id: person.id,
        full_name: person.full_name,
        has_phone: Boolean(person.phone),
      })),
    });
    return;
  }

  if (!targets.length) {
    throw new ApiError(400, "No staff members match that group.");
  }

  const key = broadcastKey(req.user.id, audience, from, to, message);
  const previous = recentBroadcasts.get(key);
  if (previous && Date.now() - previous < BROADCAST_DUPLICATE_WINDOW_MS) {
    const minutes = Math.max(1, Math.round((Date.now() - previous) / 60000));
    throw new ApiError(
      409,
      `This same message was already sent to this group ${minutes} minute(s) ago. It is probably still being delivered. Change the message if you really want to send it again.`
    );
  }
  recentBroadcasts.set(key, Date.now());

  const reachable = targets.filter((person) => person.phone).length;

  // Reply now and deliver in the background so a slow WhatsApp provider
  // cannot make the request time out (which led to repeated sends).
  res.status(202).json({
    started: true,
    total: targets.length,
    will_send: reachable,
    no_phone: targets.length - reachable,
  });

  deliverBroadcast({
    targets,
    authorName: req.user.full_name,
    message,
    key,
  }).catch((error) => {
    console.error("Broadcast failed:", error);
    recentBroadcasts.delete(key);
  });
});

export const unlockEmployeeDay = asyncHandler(async (req, res) => {
  const pool = getPool();
  const date = toYmd(parseYmd(String(req.body.date || "")));

  if (date >= getTodayYmd()) {
    throw new ApiError(400, "Only past days can be unlocked. Today is already open.");
  }

  const [users] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [
    req.params.userId,
  ]);
  if (!users.length) {
    throw new ApiError(404, "Employee not found.");
  }

  await pool.query(
    `INSERT IGNORE INTO daily_day_unlocks (user_id, plan_date, unlocked_by)
     VALUES (?, ?, ?)`,
    [req.params.userId, date, req.user.id]
  );

  res.status(201).json({ message: "Day unlocked.", date });
});

export const lockEmployeeDay = asyncHandler(async (req, res) => {
  const date = toYmd(parseYmd(String(req.params.date || "")));
  const [result] = await getPool().query(
    "DELETE FROM daily_day_unlocks WHERE user_id = ? AND plan_date = ?",
    [req.params.userId, date]
  );
  if (!result.affectedRows) {
    throw new ApiError(404, "That day was not unlocked.");
  }
  res.json({ message: "Day locked again.", date });
});
