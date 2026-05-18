import { body } from "express-validator";

export const uploadAttachmentValidator = [
  body("related_type")
    .isIn(["job", "task", "report"])
    .withMessage("Invalid related type."),
  body("related_id").isInt({ min: 1 }).withMessage("Related id is required."),
];
