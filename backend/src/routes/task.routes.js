import { Router } from "express";
import {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  startTask,
  updateTask,
} from "../controllers/task.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  completeTaskValidator,
  createTaskValidator,
  updateTaskValidator,
} from "../validators/task.validators.js";

const router = Router();

router.use(authenticate);
router.get("/", listTasks);
router.post("/", createTaskValidator, validateRequest, createTask);
router.get("/:id", getTaskById);
router.put("/:id", updateTaskValidator, validateRequest, updateTask);
router.delete("/:id", authorizeRoles("admin"), deleteTask);
router.patch("/:id/start", startTask);
router.patch(
  "/:id/complete",
  completeTaskValidator,
  validateRequest,
  completeTask
);

export default router;

