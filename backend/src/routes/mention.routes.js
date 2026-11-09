import { Router } from "express";
import { body } from "express-validator";
import {
  createMention,
  createPlannedMention,
  getMentionById,
  getMyCreatedMentions,
  getMyMentions,
  listMentions,
  readMention,
  resolveMention,
  uploadMentionFile,
} from "../controllers/mention.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { createMentionValidator } from "../validators/mention.validators.js";

const router = Router();

router.use(authenticate);
router.post(
  "/planned",
  [
    body("daily_task_id").isInt({ min: 1 }).withMessage("Planned task is required."),
    body("mentioned_user_id").isInt({ min: 1 }).withMessage("Choose who to tag."),
    body("message").trim().notEmpty().withMessage("Please explain what help you need."),
  ],
  validateRequest,
  createPlannedMention
);
router.post("/", createMentionValidator, validateRequest, createMention);
router.get("/", authorizeRoles("admin"), listMentions);
router.get("/my-created", getMyCreatedMentions);
router.get("/assigned-to-me", getMyMentions);
router.get("/:id", getMentionById);
router.post("/:id/files", uploadSingleAttachment, uploadMentionFile);
router.patch("/:id/read", readMention);
router.patch("/:id/resolve", resolveMention);

export default router;
