import { body } from "express-validator";

export const createTaskValidator = [
  body("job_id").isInt({ min: 1 }).withMessage("Job is required."),
  body("title").trim().notEmpty().withMessage("Task title is required."),
  body("assigned_by").isInt({ min: 1 }).withMessage("Assigned by is required."),
  body("assigned_to").isInt({ min: 1 }).withMessage("Assigned to is required."),
  body("parent_task_id").optional({ values: "falsy" }).isInt({ min: 1 }),
  body("description").optional({ values: "falsy" }).trim(),
  body("start_date").optional({ values: "falsy" }).isISO8601(),
  body("due_date").optional({ values: "falsy" }).isISO8601(),
];

export const updateTaskValidator = [
  body("title").optional().trim().notEmpty(),
  body("description").optional({ values: "falsy" }).trim(),
  body("assigned_to").optional().isInt({ min: 1 }),
  body("status").optional().isIn(["assigned", "ongoing", "completed", "cancelled"]),
  body("start_date").optional({ values: "falsy" }).isISO8601(),
  body("due_date").optional({ values: "falsy" }).isISO8601(),
];

export const completeTaskValidator = [
  body("completion_note").optional({ values: "falsy" }).trim(),
];

