import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".mp4",
  ".xlsx",
]);

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const relatedType = req.body.related_type || "misc";
    const folderMap = {
      job: "jobs",
      task: "tasks",
      report: "reports",
      document: "documents",
    };
    const uploadFolder = folderMap[relatedType] || "misc";
    const targetDirectory = path.resolve(process.cwd(), env.uploadsDir, uploadFolder);
    ensureDirectory(targetDirectory);
    callback(null, targetDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, fileName);
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    callback(new ApiError(400, "Unsupported file type."));
    return;
  }

  callback(null, true);
}

export const uploadSingleAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
}).single("file");
