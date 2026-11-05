import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import {
  createDailyTask,
  listDailyTasks,
  toggleDailyTask,
  deleteDailyTask,
  updateDailyTask,
  saveDayReport,
  uploadDayReportFile,
  deleteDayReportFile,
} from "../controllers/dailyTask.controller.js";
import {
  getActivityOverview,
  getEmployeeActivity,
  remindEmployee,
  sendPlanReminders,
  addEmployeeComment,
  deleteEmployeeComment,
  unlockEmployeeDay,
  lockEmployeeDay,
} from "../controllers/dailyActivity.controller.js";

const router = Router();

router.use(authenticate);

router.get("/admin/overview", authorizeRoles("admin"), getActivityOverview);
router.get("/admin/employee/:userId", authorizeRoles("admin"), getEmployeeActivity);
router.post("/admin/send-reminders", authorizeRoles("admin"), sendPlanReminders);
router.post("/admin/employee/:userId/remind", authorizeRoles("admin"), remindEmployee);
router.post(
  "/admin/employee/:userId/comments",
  authorizeRoles("admin"),
  addEmployeeComment
);
router.delete("/admin/comments/:id", authorizeRoles("admin"), deleteEmployeeComment);
router.post(
  "/admin/employee/:userId/unlock",
  authorizeRoles("admin"),
  unlockEmployeeDay
);
router.delete(
  "/admin/employee/:userId/unlock/:date",
  authorizeRoles("admin"),
  lockEmployeeDay
);
router.put("/day-report", saveDayReport);
router.post("/day-report/files", uploadSingleAttachment, uploadDayReportFile);
router.delete("/day-report/files/:id", deleteDayReportFile);
router.post("/", createDailyTask);
router.get("/", listDailyTasks);
router.put("/:id", updateDailyTask);
router.patch("/:id/toggle", toggleDailyTask);
router.delete("/:id", deleteDailyTask);

export default router;
