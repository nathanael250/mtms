import { body } from "express-validator";

export const createDocumentCategoryValidator = [
  body("name").trim().notEmpty().withMessage("Category name is required."),
  body("description").optional({ values: "falsy" }).trim(),
  body("status").optional().isIn(["active", "inactive"]),
];

export const updateDocumentCategoryValidator = [
  body("name").optional().trim().notEmpty(),
  body("description").optional({ values: "falsy" }).trim(),
  body("status").optional().isIn(["active", "inactive"]),
];
