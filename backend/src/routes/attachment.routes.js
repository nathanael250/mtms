import { Router } from "express";
import {
  deleteAttachment,
  getAttachmentById,
  uploadAttachment,
} from "../controllers/attachment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { uploadAttachmentValidator } from "../validators/attachment.validators.js";

const router = Router();

router.use(authenticate);
router.post(
  "/upload",
  uploadSingleAttachment,
  uploadAttachmentValidator,
  validateRequest,
  uploadAttachment
);
router.get("/:id", getAttachmentById);
router.delete("/:id", deleteAttachment);

export default router;

