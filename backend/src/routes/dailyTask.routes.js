import { Router } from "express";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingleAttachment } from "../middlewares/upload.middleware.js";
import {
  createDailyTask,
  listDailyTasks,
  toggleDailyTask,
  deleteDailyTask,
  updateDailyTask,
  reorderDailyTasks,
  replyToComment,
  listMyCommentThreads,
  setCarryOver,
  saveDayReport,
  uploadDayReportFile,
  deleteDayReportFile,
} from "../controllers/dailyTask.controller.js";
import {
  getActivityOverview,
  getEmployeeActivity,
  addEmployeeComment,
  deleteEmployeeComment,
  unlockEmployeeDay,
  broadcastMessage,
  lockEmployeeDay,
} from "../controllers/dailyActivity.controller.js";

const router = Router();

router.use(authenticate);

router.get("/admin/overview", authorizeRoles("admin"), getActivityOverview);
router.get("/admin/employee/:userId", authorizeRoles("admin"), getEmployeeActivity);
router.post(
  "/admin/employee/:userId/comments",
  authorizeRoles("admin"),
  addEmployeeComment
);
router.post("/admin/broadcast", authorizeRoles("admin"), broadcastMessage);
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
router.put("/reorder", reorderDailyTasks);
router.post("/comments/reply", replyToComment);
router.get("/my-comments", listMyCommentThreads);
router.patch("/:id/carry-over", setCarryOver);
router.post("/day-report/files", uploadSingleAttachment, uploadDayReportFile);
router.delete("/day-report/files/:id", deleteDayReportFile);
router.post("/", createDailyTask);
router.get("/", listDailyTasks);
router.put("/:id", updateDailyTask);
router.patch("/:id/toggle", toggleDailyTask);
router.delete("/:id", deleteDailyTask);

export default router;
