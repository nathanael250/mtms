import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { sendMentionNotifications } from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

async function getMentionOrThrow(mentionId) {
  const [rows] = await getPool().query(
    `SELECT mentions.*, reports.task_id, tasks.job_id,
            author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN task_daily_reports reports ON reports.id = mentions.report_id
     JOIN tasks ON tasks.id = reports.task_id
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     WHERE mentions.id = ?`,
    [mentionId]
  );

  if (!rows.length) {
    throw new ApiError(404, "Mention not found.");
  }

  return rows[0];
}

export const createMention = asyncHandler(async (req, res) => {
  const { report_id, mentioned_by, mentioned_user_id, message } = req.body;

  const [reports] = await getPool().query(
    `SELECT reports.id, reports.user_id, reports.task_id, tasks.job_id, tasks.title AS task_title
     FROM task_daily_reports AS reports
     JOIN tasks ON tasks.id = reports.task_id
     WHERE reports.id = ?`,
    [report_id]
  );

  if (!reports.length) {
    throw new ApiError(404, "Source report not found.");
  }

  if (req.user.role !== "admin" && reports[0].user_id !== req.user.id) {
    throw new ApiError(403, "You can only create mentions from your own report.");
  }

  const [taggedUsers] = await getPool().query(
    "SELECT id, full_name, email, phone FROM users WHERE id = ? LIMIT 1",
    [mentioned_user_id]
  );

  if (!taggedUsers.length) {
    throw new ApiError(404, "Mentioned user not found.");
  }

  const [result] = await getPool().query(
    `INSERT INTO report_mentions (report_id, mentioned_by, mentioned_user_id, message)
     VALUES (?, ?, ?, ?)`,
    [report_id, mentioned_by, mentioned_user_id, message]
  );

  await createActivityLog({
    jobId: reports[0].job_id,
    taskId: reports[0].task_id,
    userId: mentioned_by,
    action: "mention_created",
    description: `${req.user.full_name} mentioned another staff member from task "${reports[0].task_title}".`,
  });

  await sendMentionNotifications({
    taggedUser: taggedUsers[0],
    authorName: req.user.full_name,
    taskTitle: reports[0].task_title,
    message,
  });

  const mention = await getMentionOrThrow(result.insertId);
  res.status(201).json({ message: "Mention created successfully.", mention });
});

export const listMentions = asyncHandler(async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT mentions.*, author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     ORDER BY mentions.id DESC`
  );
  res.json({ mentions: rows });
});

export const getMentionById = asyncHandler(async (req, res) => {
  const mention = await getMentionOrThrow(req.params.id);
  res.json({ mention });
});

export const getMyCreatedMentions = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT mentions.*, author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     WHERE mentions.mentioned_by = ?
     ORDER BY mentions.id DESC`,
    [req.user.id]
  );
  res.json({ mentions: rows });
});

export const getMyMentions = asyncHandler(async (req, res) => {
  const [rows] = await getPool().query(
    `SELECT mentions.*, author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     JOIN users AS author ON author.id = mentions.mentioned_by
     JOIN users AS tagged ON tagged.id = mentions.mentioned_user_id
     WHERE mentions.mentioned_user_id = ?
     ORDER BY mentions.id DESC`,
    [req.user.id]
  );
  res.json({ mentions: rows });
});

async function transitionMention(req, res, nextStatus, actionName, verb) {
  const mention = await getMentionOrThrow(req.params.id);

  if (req.user.role !== "admin" && mention.mentioned_user_id !== req.user.id) {
    throw new ApiError(403, "You cannot update this mention.");
  }

  await getPool().query(
    `UPDATE report_mentions SET status = ? WHERE id = ?`,
    [nextStatus, req.params.id]
  );

  await createActivityLog({
    jobId: mention.job_id,
    taskId: mention.task_id,
    userId: req.user.id,
    action: actionName,
    description: `${req.user.full_name} ${verb} a report mention.`,
  });

  res.json({ message: `Mention ${nextStatus} successfully.` });
}

export const readMention = asyncHandler(async (req, res) =>
  transitionMention(req, res, "read", "mention_read", "read")
);

export const resolveMention = asyncHandler(async (req, res) =>
  transitionMention(req, res, "resolved", "mention_resolved", "resolved")
);
