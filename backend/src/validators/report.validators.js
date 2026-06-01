import { body } from "express-validator";

export const createReportValidator = [
  body("task_id").isInt({ min: 1 }).withMessage("Task is required."),
  body("user_id").isInt({ min: 1 }).withMessage("User is required."),
  body("report_date").isISO8601().withMessage("Report date is required."),
  body("activity_done")
    .optional({ values: "falsy" })
    .trim()
    .notEmpty(),
  body("completed_tasks").optional({ values: "falsy" }).trim(),
  body("ongoing_tasks").optional({ values: "falsy" }).trim(),
  body("next_tasks").optional({ values: "falsy" }).trim(),
  body("location").optional({ values: "falsy" }).trim(),
  body("comment").optional({ values: "falsy" }).trim(),
];

export const updateReportValidator = [
  body("report_date").optional().isISO8601(),
  body("activity_done").optional().trim().notEmpty(),
  body("completed_tasks").optional({ values: "falsy" }).trim(),
  body("ongoing_tasks").optional({ values: "falsy" }).trim(),
  body("next_tasks").optional({ values: "falsy" }).trim(),
  body("location").optional({ values: "falsy" }).trim(),
  body("comment").optional({ values: "falsy" }).trim(),
];
