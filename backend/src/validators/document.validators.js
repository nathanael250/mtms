import { body } from "express-validator";

export const uploadDocumentValidator = [
  body("job_id").isInt({ min: 1 }).withMessage("Job is required."),
  body("category_id").isInt({ min: 1 }).withMessage("Document category is required."),
  body("title").trim().notEmpty().withMessage("Document title is required."),
  body("description").optional({ values: "falsy" }).trim(),
];

export const reviewDocumentValidator = [
  body("review_comment").optional({ values: "falsy" }).trim(),
];
