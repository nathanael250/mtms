import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function buildMentionText({ taggedUser, authorName, taskTitle, message }) {
  return [
    `Hello ${taggedUser.full_name},`,
    "",
    `${authorName} mentioned you on task "${taskTitle}".`,
    "",
    `Message: ${message}`,
    "",
    "Please sign in to MOPAS to review it.",
  ].join("\n");
}

function normalizeWhatsappNumber(phone) {
  if (!phone) {
    return "";
  }

  const value = String(phone).trim();
  if (value.endsWith("@c.us")) {
    return value;
  }

  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `250${digits.slice(1)}@c.us`;
  }
  if (digits.startsWith("250")) {
    return `${digits}@c.us`;
  }

  return digits;
}

async function sendEmail({ to, subject, text }) {
  if (!env.emailNotificationsEnabled || !to) {
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth:
      env.smtpUser && env.smtpPass
        ? {
            user: env.smtpUser,
            pass: env.smtpPass,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
  });

  return { skipped: false };
}

async function sendWhatsapp({ to, text }) {
  const phone = normalizeWhatsappNumber(to || env.whatsappDefaultTo);
  if (!env.whatsappNotificationsEnabled || !phone) {
    return { skipped: true };
  }

  if (env.whatsappProvider === "wawp") {
    return sendWawpWhatsapp({ to: phone, text });
  }

  return sendCloudWhatsapp({ to: phone, text });
}

async function sendWawpWhatsapp({ to, text }) {
  if (
    !env.wawpApiBaseUrl ||
    !env.wawpInstanceId ||
    !env.wawpAccessToken
  ) {
    return { skipped: true };
  }

  const response = await fetch(
    `${env.wawpApiBaseUrl.replace(/\/$/, "")}/v2/send/text?${new URLSearchParams({
      instance_id: env.wawpInstanceId,
      access_token: env.wawpAccessToken,
    }).toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: to,
        message: text,
        reply_to: null,
      }),
      // A slow provider must not hold up a whole broadcast.
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    // Cloudflare error pages are long HTML; keep the log readable.
    const summary = body.trimStart().startsWith("<")
      ? `HTTP ${response.status} (the provider returned an error page)`
      : body.slice(0, 300);
    throw new Error(`WAWP notification failed: ${summary}`);
  }

  return { skipped: false };
}

async function sendCloudWhatsapp({ to, text }) {
  if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
    return { skipped: true };
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp notification failed: ${body}`);
  }

  return { skipped: false };
}

// Unlike sendWhatsapp, never falls back to the default number when `to` is empty.
export async function sendWhatsappMessage({ to, text }) {
  if (!normalizeWhatsappNumber(to)) {
    return { skipped: true };
  }
  return sendWhatsapp({ to, text });
}

export async function sendMentionNotifications({
  taggedUser,
  authorName,
  taskTitle,
  message,
}) {
  const text = buildMentionText({ taggedUser, authorName, taskTitle, message });
  const subject = `You were mentioned on "${taskTitle}"`;

  const results = await Promise.allSettled([
    sendEmail({
      to: taggedUser.email,
      subject,
      text,
    }),
    sendWhatsapp({
      to: taggedUser.phone,
      text,
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
  }
}

export async function sendPlanCommentNotification({
  employee,
  authorName,
  planDate,
  taskDescription,
  message,
  direct = false,
}) {
  if (!employee.phone) {
    return "no_phone";
  }

  if (direct) {
    const name = String(employee.full_name || "").trim().split(/\s+/)[0] || "there";
    const result = await sendWhatsapp({
      to: employee.phone,
      text: [`Hello ${name},`, "", message, "", `- ${authorName} (MOPAS)`].join("\n"),
    });
    return result.skipped ? "disabled" : "sent";
  }

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${planDate}T00:00:00Z`));
  const firstName = String(employee.full_name || "").trim().split(/\s+/)[0] || "there";

  const text = [
    `Hello ${firstName},`,
    "",
    taskDescription
      ? `${authorName} commented on your planned task "${taskDescription}" (${dateLabel}):`
      : `${authorName} commented on your daily plan for ${dateLabel}:`,
    "",
    message,
    "",
    "Please sign in to MOPAS, open My Tasks > Planned tasks, pick that date and update your plan if needed.",
  ].join("\n");

  const result = await sendWhatsapp({ to: employee.phone, text });
  return result.skipped ? "disabled" : "sent";
}

export async function sendMentionResolvedNotification({
  tagger,
  resolverName,
  taskTitle,
  originalMessage,
  resolutionMessage,
  fileCount,
}) {
  if (!tagger.phone) {
    return "no_phone";
  }

  const firstName = String(tagger.full_name || "").trim().split(/\s+/)[0] || "there";
  const lines = [
    `Hello ${firstName},`,
    "",
    `${resolverName} resolved your mention on task "${taskTitle}".`,
    "",
    `Your message: ${originalMessage}`,
  ];
  if (resolutionMessage) {
    lines.push("", `Their reply: ${resolutionMessage}`);
  }
  if (fileCount) {
    lines.push("", `${fileCount} document${fileCount === 1 ? "" : "s"} attached.`);
  }
  lines.push("", "Please sign in to MOPAS and open My Mentions to see the details.");

  const result = await sendWhatsapp({ to: tagger.phone, text: lines.join("\n") });
  return result.skipped ? "disabled" : "sent";
}

// Throws if WhatsApp delivery fails. Returns "disabled" when WhatsApp is off.
export async function sendCredentialsNotification({ user, password, loginUrl }) {
  const firstName = String(user.full_name || "").trim().split(/\s+/)[0] || "there";
  const text = [
    `Hello ${firstName},`,
    "",
    "Your MOPAS account is ready. Use these details to sign in:",
    "",
    `Link: ${loginUrl}`,
    `Email: ${user.email}`,
    `Password: ${password}`,
  ].join("\n");

  const result = await sendWhatsapp({ to: user.phone, text });
  return result.skipped ? "disabled" : "sent";
}

// Free-text message from an admin to one staff member (used for broadcasts).
// Throws if WhatsApp delivery fails. Returns "sent", "disabled" or "no_phone".
export async function sendBroadcastNotification({ employee, authorName, message }) {
  if (!employee.phone) {
    return "no_phone";
  }
  const name = String(employee.full_name || "").trim().split(/\s+/)[0] || "there";
  const result = await sendWhatsapp({
    to: employee.phone,
    text: [`Hello ${name},`, "", message, "", `- ${authorName} (MOPAS)`].join("\n"),
  });
  return result.skipped ? "disabled" : "sent";
}
