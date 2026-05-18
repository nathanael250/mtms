import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  listStaff,
  listUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  createUserValidator,
  updateUserValidator,
} from "../validators/user.validators.js";

const router = Router();

router.use(authenticate);
router.get("/staff", listStaff);
router.get("/", authorizeRoles("admin"), listUsers);
router.post("/", authorizeRoles("admin"), createUserValidator, validateRequest, createUser);
router.get("/:id", authorizeRoles("admin"), getUserById);
router.put("/:id", authorizeRoles("admin"), updateUserValidator, validateRequest, updateUser);
router.delete("/:id", authorizeRoles("admin"), deleteUser);

export default router;

