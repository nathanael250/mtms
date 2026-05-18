import { body } from "express-validator";

export const createUserValidator = [
  body("full_name").trim().notEmpty().withMessage("Full name is required."),
  body("email").isEmail().withMessage("A valid email is required."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  body("role_id").isInt({ min: 1 }).withMessage("Role is required."),
  body("phone").optional({ values: "falsy" }).trim(),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Invalid user status."),
];

export const updateUserValidator = [
  body("full_name").optional().trim().notEmpty(),
  body("email").optional().isEmail().withMessage("A valid email is required."),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
  body("role_id").optional().isInt({ min: 1 }),
  body("status").optional().isIn(["active", "inactive"]),
  body("phone").optional({ values: "falsy" }).trim(),
];

