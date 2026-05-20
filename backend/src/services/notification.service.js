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
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WAWP notification failed: ${body}`);
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
