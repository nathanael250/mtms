import { body } from "express-validator";

export const createContactValidator = [
  body("full_name").trim().notEmpty().withMessage("Full name is required."),
  body("category_id").isInt({ min: 1 }).withMessage("Category is required."),
  body("created_by").isInt({ min: 1 }).withMessage("Created by is required."),
  body("email").optional({ values: "falsy" }).isEmail(),
  body("custom_category").optional({ values: "falsy" }).trim(),
  body("company_name").optional({ values: "falsy" }).trim(),
  body("address").optional({ values: "falsy" }).trim(),
  body("notes").optional({ values: "falsy" }).trim(),
];

export const updateContactValidator = [
  body("full_name").optional().trim().notEmpty(),
  body("category_id").optional().isInt({ min: 1 }),
  body("email").optional({ values: "falsy" }).isEmail(),
  body("custom_category").optional({ values: "falsy" }).trim(),
  body("company_name").optional({ values: "falsy" }).trim(),
  body("address").optional({ values: "falsy" }).trim(),
  body("notes").optional({ values: "falsy" }).trim(),
];

