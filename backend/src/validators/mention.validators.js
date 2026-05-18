import { body } from "express-validator";

export const createMentionValidator = [
  body("report_id").isInt({ min: 1 }).withMessage("Report is required."),
  body("mentioned_by")
    .isInt({ min: 1 })
    .withMessage("Mentioned by is required."),
  body("mentioned_user_id")
    .isInt({ min: 1 })
    .withMessage("Mentioned user is required."),
  body("message").trim().notEmpty().withMessage("Mention message is required."),
];
