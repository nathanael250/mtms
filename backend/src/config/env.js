import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Sign-in link sent to users over WhatsApp. Override with LOGIN_URL if needed.
  loginUrl: process.env.LOGIN_URL || "https://management.mopasltd.com/",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "job_management_system",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  initDbOnStart: process.env.INIT_DB_ON_START === "true",
  seedAdminOnStart: process.env.SEED_ADMIN_ON_START === "true",
  defaultAdminName: process.env.DEFAULT_ADMIN_NAME || "System Admin",
  defaultAdminEmail:
    process.env.DEFAULT_ADMIN_EMAIL || "admin@jobmanagement.local",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "Admin12345!",
  // Timezone that defines "today" for daily plans (the day changes at midnight here).
  appTimezone:
    process.env.APP_TIMEZONE || process.env.REMINDER_TIMEZONE || "Africa/Kigali",
  // Accounts (by email, comma separated) that must not appear in the "Ask for help"
  // list, such as a technical admin account used only to fix issues.
  mentionHiddenEmails: (process.env.MENTION_HIDDEN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  uploadsDir: process.env.UPLOADS_DIR || "uploads",
  googleConnectedEmail:
    process.env.GOOGLE_CONNECTED_EMAIL || "movepromotion1@gmail.com",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/settings/google-drive/callback",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  emailNotificationsEnabled:
    process.env.EMAIL_NOTIFICATIONS_ENABLED === "true",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom:
    process.env.SMTP_FROM || process.env.SMTP_USER || "MOPAS <no-reply@mopas.local>",
  whatsappNotificationsEnabled:
    process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true",
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "cloud",
  whatsappDefaultTo: process.env.WHATSAPP_DEFAULT_TO || "",
  wawpApiBaseUrl: process.env.WAWP_API_BASE_URL || "https://api.wawp.net",
  wawpInstanceId: process.env.WAWP_INSTANCE_ID || "",
  wawpAccessToken: process.env.WAWP_ACCESS_TOKEN || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
};
