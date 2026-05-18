import { Router } from "express";
import { listActivityLogs } from "../controllers/activityLog.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", authorizeRoles("admin"), listActivityLogs);

export default router;
