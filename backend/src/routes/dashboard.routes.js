import { Router } from "express";
import {
  getAdminDashboard,
  getStaffDashboard,
} from "../controllers/dashboard.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/admin", authorizeRoles("admin"), getAdminDashboard);
router.get("/staff", authorizeRoles("staff", "admin"), getStaffDashboard);

export default router;

