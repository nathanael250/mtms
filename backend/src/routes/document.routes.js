import { Router } from "express";
import {
  approveDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  listMyUploads,
  listPendingDocuments,
  rejectDocument,
  uploadDocument,
} from "../controllers/document.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  reviewDocumentValidator,
  uploadDocumentValidator,
} from "../validators/document.validators.js";

const router = Router();

router.use(authenticate);
router.post(
  "/upload",
  uploadSingleAttachment,
  uploadDocumentValidator,
  validateRequest,
  uploadDocument
);
router.get("/", listDocuments);
router.get("/pending", authorizeRoles("admin"), listPendingDocuments);
router.get("/my-uploads", listMyUploads);
router.get("/:id", getDocumentById);
router.patch(
  "/:id/approve",
  authorizeRoles("admin"),
  reviewDocumentValidator,
  validateRequest,
  approveDocument
);
router.patch(
  "/:id/reject",
  authorizeRoles("admin"),
  reviewDocumentValidator,
  validateRequest,
  rejectDocument
);
router.delete("/:id", deleteDocument);

export default router;
