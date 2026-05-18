import { Router } from "express";
import {
  createReport,
  deleteReport,
  getReportById,
  getReportsByJob,
  getReportsByTask,
  listReports,
  updateReport,
} from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  createReportValidator,
  updateReportValidator,
} from "../validators/report.validators.js";

const router = Router();

router.use(authenticate);
router.post("/", createReportValidator, validateRequest, createReport);
router.get("/", listReports);
router.get("/task/:id", getReportsByTask);
router.get("/job/:id", getReportsByJob);
router.get("/:id", getReportById);
router.put("/:id", updateReportValidator, validateRequest, updateReport);
router.delete("/:id", deleteReport);

export default router;
