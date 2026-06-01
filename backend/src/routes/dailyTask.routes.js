import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  createDailyTask,
  listDailyTasks,
  toggleDailyTask,
  deleteDailyTask,
} from "../controllers/dailyTask.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createDailyTask);
router.get("/", listDailyTasks);
router.patch("/:id/toggle", toggleDailyTask);
router.delete("/:id", deleteDailyTask);

export default router;
