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

// Job forms: several documents at once ("files"); "file" kept for older callers.
export const uploadJobDocuments = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: "files", maxCount: 20 },
  { name: "file", maxCount: 1 },
]);

// Staff folder uploads go to Google Drive: videos and audio are allowed and the limit is higher.
const staffFileExtensions = new Set([
  ...allowedExtensions,
  ".mov", ".avi", ".mkv", ".webm", ".m4v",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac",
  ".ppt", ".pptx", ".xls", ".txt", ".csv", ".zip", ".gif", ".webp",
]);

const staffFileStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    const target = path.resolve(process.cwd(), env.uploadsDir, "staff-files");
    ensureDirectory(target);
    callback(null, target);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

export const STAFF_FILE_MAX_MB = 500;

export const uploadStaffFile = multer({
  storage: staffFileStorage,
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!staffFileExtensions.has(extension)) {
      callback(new ApiError(400, "Unsupported file type."));
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: STAFF_FILE_MAX_MB * 1024 * 1024 },
}).single("file");
