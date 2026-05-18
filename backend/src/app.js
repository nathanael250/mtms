import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import jobRoutes from "./routes/job.routes.js";
import taskRoutes from "./routes/task.routes.js";
import reportRoutes from "./routes/report.routes.js";
import mentionRoutes from "./routes/mention.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";
import documentCategoryRoutes from "./routes/documentCategory.routes.js";
import documentRoutes from "./routes/document.routes.js";
import googleDriveRoutes from "./routes/googleDrive.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    `/${env.uploadsDir}`,
    express.static(path.resolve(process.cwd(), env.uploadsDir))
  );

  app.get("/", (_req, res) => {
    res.json({
      message: "Job management backend is running.",
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/task-reports", reportRoutes);
  app.use("/api/report-mentions", mentionRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/attachments", attachmentRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/activity-logs", activityLogRoutes);
  app.use("/api/document-categories", documentCategoryRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/settings/google-drive", googleDriveRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
