import { Router } from "express";
import {
  attachReferenceLink,
  deleteStaffFile,
  listStaffFiles,
  listStaffFolders,
  uploadStaffFile,
} from "../controllers/staffFile.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadStaffFile as receiveStaffFile } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", listStaffFiles);
router.get("/folders", authorizeRoles("admin"), listStaffFolders);
router.post("/", receiveStaffFile, uploadStaffFile);
router.post("/link", attachReferenceLink);
router.delete("/:id", deleteStaffFile);

export default router;
