import { ApiError } from "../utils/apiError.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "This file is too large." });
    return;
  }
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Internal server error",
    details: error.details || null,
    ...(process.env.NODE_ENV !== "production" && error.stack
      ? { stack: error.stack }
      : {}),
  });
}

