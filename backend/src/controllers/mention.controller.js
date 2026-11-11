import { getPool } from "../config/database.js";
import { createActivityLog } from "../services/activityLog.service.js";
import fs from "fs/promises";
import {
  sendMentionNotifications,
  sendMentionResolvedNotification,
} from "../services/notification.service.js";
import { assertDayEditable } from "./dailyTask.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

// Adds a `files` array (tag documents and resolution documents) to each mention row.
async function withFiles(mentions) {
  if (!mentions.length) {
    return mentions;
  }
  const [files] = await getPool().query(
    `SELECT mention_files.id, mention_files.mention_id, mention_files.stage,
            mention_files.file_name, mention_files.file_path, mention_files.file_type,
            mention_files.created_at, users.full_name AS uploaded_by_name
     FROM mention_files
     JOIN users ON users.id = mention_files.uploaded_by
     WHERE mention_files.mention_id IN (?)
     ORDER BY mention_files.id ASC`,
    [mentions.map((mention) => mention.id)]
  );
  return mentions.map((mention) => ({
    ...mention,
    files: files.filter((file) => file.mention_id === mention.id),
  }));
}

async function getMentionOrThrow(mentionId) {
  const [rows] = await getPool().query(
    `SELECT mentions.*, reports.task_id, tasks.job_id,
            author.full_name AS mentioned_by_name,
            tagged.full_name AS mentioned_user_name
     FROM report_mentions AS mentions
     LEFT JOIN task_daily_reports reports ON reports.id = mentions.report_id
     LEFT JOIN tasks ON tasks.id = reports.task_id
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

  const [mention] = await withFiles([await getMentionOrThrow(result.insertId)]);
  res.status(201).json({ message: "Mention created successfully.", mention });
});

// A staff member asks a colleague for help on one of their own planned (daily) tasks.
export const createPlannedMention = asyncHandler(async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) {
    throw new ApiError(400, "Please explain what help you need.");
  }
  if (message.length > 2000) {
    throw new ApiError(400, "The message is too long (maximum 2000 characters).");
  }

  const [tasks] = await getPool().query(
    `SELECT id, description, DATE_FORMAT(created_date, '%Y-%m-%d') AS plan_day
     FROM daily_tasks
     WHERE id = ? AND user_id = ? AND parent_task_id IS NULL`,
    [req.body.daily_task_id, req.user.id]
  );
  if (!tasks.length) {
    throw new ApiError(404, "Planned task not found.");
  }
  await assertDayEditable(req.user.id, tasks[0].plan_day);

  if (Number(req.body.mentioned_user_id) === req.user.id) {
    throw new ApiError(400, "You cannot tag yourself.");
  }
  const [taggedUsers] = await getPool().query(
    `SELECT users.id, users.full_name, users.email, users.phone
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE users.id = ? AND users.status = 'active'
       AND (roles.name = 'staff' OR users.can_receive_help = 1)
     LIMIT 1`,
    [req.body.mentioned_user_id]
  );
  if (!taggedUsers.length) {
    throw new ApiError(404, "That staff member was not found.");
  }

  const [result] = await getPool().query(
    `INSERT INTO report_mentions
       (report_id, daily_task_id, source_title, mentioned_by, mentioned_user_id, message)
     VALUES (NULL, ?, ?, ?, ?, ?)`,
    [
      tasks[0].id,
      tasks[0].description.slice(0, 255),
      req.user.id,
      taggedUsers[0].id,
      message,
    ]
  );

  // A failed WhatsApp message must not undo the tag; it is still on their Mentions page.
  try {
    await sendMentionNotifications({
      taggedUser: taggedUsers[0],
      authorName: req.user.full_name,
      taskTitle: tasks[0].description,
      message,
    });
  } catch (error) {
    console.error(`Planned mention notification failed for mention ${result.insertId}:`, error.message);
  }

  const [mention] = await withFiles([await getMentionOrThrow(result.insertId)]);
  res.status(201).json({ message: "Help request sent.", mention });
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
  res.json({ mentions: await withFiles(rows) });
});

export const getMentionById = asyncHandler(async (req, res) => {
  const mention = await getMentionOrThrow(req.params.id);
  if (
    req.user.role !== "admin" &&
    mention.mentioned_by !== req.user.id &&
    mention.mentioned_user_id !== req.user.id
  ) {
    throw new ApiError(403, "You cannot view this mention.");
  }
  const [withDocuments] = await withFiles([mention]);
  res.json({ mention: withDocuments });
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
  res.json({ mentions: await withFiles(rows) });
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
  res.json({ mentions: await withFiles(rows) });
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

  if (mention.job_id) {
    await createActivityLog({
      jobId: mention.job_id,
      taskId: mention.task_id,
      userId: req.user.id,
      action: actionName,
      description: `${req.user.full_name} ${verb} a report mention.`,
    });
  }

  res.json({ message: `Mention ${nextStatus} successfully.` });
}

export const readMention = asyncHandler(async (req, res) =>
  transitionMention(req, res, "read", "mention_read", "read")
);

export const resolveMention = asyncHandler(async (req, res) => {
  const mention = await getMentionOrThrow(req.params.id);

  if (req.user.role !== "admin" && mention.mentioned_user_id !== req.user.id) {
    throw new ApiError(403, "You cannot update this mention.");
  }
  if (mention.status === "resolved") {
    throw new ApiError(400, "This mention is already resolved.");
  }

  const resolutionMessage = String(req.body.message || "").trim();
  if (resolutionMessage.length > 2000) {
    throw new ApiError(400, "The resolution message is too long (maximum 2000 characters).");
  }

  await getPool().query(
    `UPDATE report_mentions
     SET status = 'resolved', resolution_message = ?, resolved_at = NOW()
     WHERE id = ?`,
    [resolutionMessage || null, mention.id]
  );

  if (mention.job_id) {
    await createActivityLog({
      jobId: mention.job_id,
      taskId: mention.task_id,
      userId: req.user.id,
      action: "mention_resolved",
      description: `${req.user.full_name} resolved a report mention.`,
    });
  }

  // Tell the person who tagged them, unless they resolved their own tag.
  let whatsapp = "not_needed";
  if (mention.mentioned_by !== req.user.id) {
    try {
      const [taggers] = await getPool().query(
        "SELECT id, full_name, phone FROM users WHERE id = ? LIMIT 1",
        [mention.mentioned_by]
      );
      const [[count]] = await getPool().query(
        "SELECT COUNT(*) AS total FROM mention_files WHERE mention_id = ? AND stage = 'resolution'",
        [mention.id]
      );
      const [[task]] = mention.report_id
        ? await getPool().query(
            `SELECT tasks.title FROM task_daily_reports reports
             JOIN tasks ON tasks.id = reports.task_id WHERE reports.id = ?`,
            [mention.report_id]
          )
        : [[{ title: mention.source_title }]];
      whatsapp = await sendMentionResolvedNotification({
        tagger: taggers[0],
        resolverName: req.user.full_name,
        taskTitle: task?.title || "a task",
        originalMessage: mention.message,
        resolutionMessage,
        fileCount: Number(count.total),
      });
    } catch (error) {
      console.error(`Mention resolved WhatsApp failed for mention ${mention.id}:`, error.message);
      whatsapp = "failed";
    }
  }

  const [updated] = await withFiles([await getMentionOrThrow(mention.id)]);
  res.json({ message: "Mention resolved successfully.", whatsapp, mention: updated });
});

// The tagger attaches documents to the tag; the tagged person attaches documents to the
// resolution. Both only while the mention is still open.
export const uploadMentionFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "A file is required.");
  }

  try {
    const mention = await getMentionOrThrow(req.params.id);

    let stage;
    if (mention.mentioned_user_id === req.user.id) {
      stage = "resolution";
    } else if (mention.mentioned_by === req.user.id || req.user.role === "admin") {
      stage = "tag";
    } else {
      throw new ApiError(403, "You cannot add documents to this mention.");
    }
    if (mention.status === "resolved") {
      throw new ApiError(400, "This mention is already resolved.");
    }

    const relativePath = req.file.path.replace(`${process.cwd()}/`, "");
    const [result] = await getPool().query(
      `INSERT INTO mention_files (mention_id, stage, file_name, file_path, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mention.id, stage, req.file.originalname, relativePath, req.file.mimetype, req.user.id]
    );

    res.status(201).json({
      message: "Document attached.",
      file: {
        id: result.insertId,
        stage,
        file_name: req.file.originalname,
        file_path: relativePath,
        file_type: req.file.mimetype,
      },
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
});
