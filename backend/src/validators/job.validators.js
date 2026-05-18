import { body } from "express-validator";

export const createJobValidator = [
  body("job_code").trim().notEmpty().withMessage("Job code is required."),
  body("title").trim().notEmpty().withMessage("Job title is required."),
  body("created_by").isInt({ min: 1 }).withMessage("Created by is required."),
  body("description").optional({ values: "falsy" }).trim(),
  body("start_date").optional({ values: "falsy" }).isISO8601(),
  body("end_date").optional({ values: "falsy" }).isISO8601(),
];

export const updateJobValidator = [
  body("job_code").optional().trim().notEmpty(),
  body("title").optional().trim().notEmpty(),
  body("description").optional({ values: "falsy" }).trim(),
  body("start_date").optional({ values: "falsy" }).isISO8601(),
  body("end_date").optional({ values: "falsy" }).isISO8601(),
];

export const markJobCompletedValidator = [
  body("completion_note").optional({ values: "falsy" }).trim(),
];

export const approveRejectJobValidator = [
  body("approval_comment").optional({ values: "falsy" }).trim(),
  body("status")
    .optional()
    .isIn(["ongoing", "rejected"])
    .withMessage("Invalid rejection status."),
];

