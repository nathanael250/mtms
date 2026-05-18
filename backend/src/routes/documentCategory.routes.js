import { Router } from "express";
import {
  createDocumentCategory,
  deleteDocumentCategory,
  listDocumentCategories,
  updateDocumentCategory,
} from "../controllers/documentCategory.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  createDocumentCategoryValidator,
  updateDocumentCategoryValidator,
} from "../validators/documentCategory.validators.js";

const router = Router();

router.use(authenticate);
router.get("/", listDocumentCategories);
router.post(
  "/",
  authorizeRoles("admin"),
  createDocumentCategoryValidator,
  validateRequest,
  createDocumentCategory
);
router.put(
  "/:id",
  authorizeRoles("admin"),
  updateDocumentCategoryValidator,
  validateRequest,
  updateDocumentCategory
);
router.delete("/:id", authorizeRoles("admin"), deleteDocumentCategory);

export default router;
