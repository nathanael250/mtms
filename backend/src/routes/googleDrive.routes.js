import { Router } from "express";
import {
  getGoogleDriveSettings,
  upsertGoogleDriveSettings,
} from "../controllers/googleDrive.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { googleDriveSettingsValidator } from "../validators/googleDrive.validators.js";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));
router.get("/", getGoogleDriveSettings);
router.post(
  "/connect",
  googleDriveSettingsValidator,
  validateRequest,
  upsertGoogleDriveSettings
);
router.patch(
  "/",
  googleDriveSettingsValidator,
  validateRequest,
  upsertGoogleDriveSettings
);

export default router;
