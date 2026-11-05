import { getPool } from "../config/database.js";
import { env } from "../config/env.js";
import { sendWhatsappMessage } from "./notification.service.js";

const REMINDER_TYPE = "daily_plan";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
// Still send if the server restarts shortly after the reminder time.
const GRACE_MINUTES = 180;

function getLocalParts(timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function buildReminderText(fullName) {
  const firstName = String(fullName || "").trim().split(/\s+/)[0] || "there";
  return [
    `Good morning ${firstName},`,
    "",
    "You have not added your daily plan for today yet.",
    "Please sign in to MOPAS, open My Tasks and add what you will work on today.",
  ].join("\n");
}

export async function sendDailyPlanReminders({ dryRun = false, skipDedupe = false } = {}) {
  const pool = getPool();
  const { date } = getLocalParts(env.reminderTimezone);

  const [staff] = await pool.query(
    `SELECT users.id, users.full_name, users.phone
     FROM users JOIN roles ON roles.id = users.role_id
     WHERE roles.name = 'staff' AND users.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM daily_tasks
         WHERE daily_tasks.user_id = users.id
           AND daily_tasks.created_date = ?
           AND daily_tasks.parent_task_id IS NULL
       )
     ORDER BY users.full_name ASC`,
    [date]
  );

  const results = [];

  for (const person of staff) {
    const entry = { id: person.id, full_name: person.full_name };

    if (!person.phone) {
      results.push({ ...entry, status: "no_phone" });
      continue;
    }
    if (dryRun) {
      results.push({ ...entry, status: "would_send" });
      continue;
    }

    if (!skipDedupe) {
      const [log] = await pool.query(
        `INSERT IGNORE INTO reminder_logs (user_id, reminder_type, reminder_date)
         VALUES (?, ?, ?)`,
        [person.id, REMINDER_TYPE, date]
      );
      if (!log.affectedRows) {
        results.push({ ...entry, status: "already_sent" });
        continue;
      }
    }

    try {
      const sent = await sendWhatsappMessage({
        to: person.phone,
        text: buildReminderText(person.full_name),
      });
      if (sent.skipped) {
        // WhatsApp is disabled or not configured; allow a later retry.
        if (!skipDedupe) {
          await pool.query(
            "DELETE FROM reminder_logs WHERE user_id = ? AND reminder_type = ? AND reminder_date = ?",
            [person.id, REMINDER_TYPE, date]
          );
        }
        results.push({ ...entry, status: "whatsapp_disabled" });
      } else {
        results.push({ ...entry, status: "sent" });
      }
    } catch (error) {
      console.error(`Daily plan reminder failed for user ${person.id}:`, error.message);
      if (!skipDedupe) {
        await pool.query(
          "DELETE FROM reminder_logs WHERE user_id = ? AND reminder_type = ? AND reminder_date = ?",
          [person.id, REMINDER_TYPE, date]
        );
      }
      results.push({ ...entry, status: "failed" });
    }
  }

  const count = (status) => results.filter((item) => item.status === status).length;

  return {
    date,
    dry_run: dryRun,
    counts: {
      without_plan: results.length,
      sent: count("sent"),
      would_send: count("would_send"),
      no_phone: count("no_phone"),
      already_sent: count("already_sent"),
      failed: count("failed"),
      whatsapp_disabled: count("whatsapp_disabled"),
    },
    results,
  };
}

export function startDailyReminderScheduler() {
  if (!env.dailyReminderEnabled) {
    return;
  }

  const reminderMinutes = parseTime(env.dailyReminderTime);
  if (reminderMinutes === null) {
    console.error(
      `DAILY_REMINDER_TIME "${env.dailyReminderTime}" is invalid (use HH:MM). Reminders disabled.`
    );
    return;
  }

  let lastRunDate = null;

  async function tick() {
    const { date, weekday, minutes } = getLocalParts(env.reminderTimezone);
    const elapsed = minutes - reminderMinutes;

    if (
      lastRunDate === date ||
      !WEEKDAYS.includes(weekday) ||
      elapsed < 0 ||
      elapsed > GRACE_MINUTES
    ) {
      return;
    }

    lastRunDate = date;
    try {
      const result = await sendDailyPlanReminders();
      console.log(`Daily plan reminders for ${date}:`, JSON.stringify(result.counts));
    } catch (error) {
      console.error("Daily plan reminder run failed:", error);
    }
  }

  setInterval(tick, 60 * 1000);
  console.log(
    `Daily plan reminders on weekdays at ${env.dailyReminderTime} (${env.reminderTimezone}).`
  );
}
