import { Router } from "express";
import {
  approveJobCompletion,
  cancelJob,
  createJob,
  deleteJob,
  getJobById,
  getJobProgress,
  listJobs,
  markJobCompleted,
  rejectJobCompletion,
  updateJob,
} from "../controllers/job.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  approveRejectJobValidator,
  createJobValidator,
  markJobCompletedValidator,
  updateJobValidator,
} from "../validators/job.validators.js";

const router = Router();

router.use(authenticate);
router.get("/", listJobs);
router.post(
  "/",
  authorizeRoles("admin"),
  uploadSingleAttachment,
  createJobValidator,
  validateRequest,
  createJob
);
router.get("/:id", getJobById);
router.get("/:id/progress", getJobProgress);
router.put(
  "/:id",
  authorizeRoles("admin"),
  uploadSingleAttachment,
  updateJobValidator,
  validateRequest,
  updateJob
);
router.delete("/:id", authorizeRoles("admin"), deleteJob);
router.patch(
  "/:id/mark-completed",
  markJobCompletedValidator,
  validateRequest,
  markJobCompleted
);
router.patch(
  "/:id/approve-completion",
  authorizeRoles("admin"),
  approveRejectJobValidator,
  validateRequest,
  approveJobCompletion
);
router.patch(
  "/:id/reject-completion",
  authorizeRoles("admin"),
  approveRejectJobValidator,
  validateRequest,
  rejectJobCompletion
);
router.patch("/:id/cancel", authorizeRoles("admin"), cancelJob);

export default router;

