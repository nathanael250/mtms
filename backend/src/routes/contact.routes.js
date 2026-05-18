import { Router } from "express";
import {
  createContact,
  createContactCategory,
  deleteContact,
  getContactById,
  listContactCategories,
  listContacts,
  updateContact,
} from "../controllers/contact.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  createContactValidator,
  updateContactValidator,
} from "../validators/contact.validators.js";

const router = Router();

router.use(authenticate);
router.get("/", listContacts);
router.post("/", createContactValidator, validateRequest, createContact);
router.get("/categories", listContactCategories);
router.post("/categories", authorizeRoles("admin"), createContactCategory);
router.get("/:id", getContactById);
router.put("/:id", updateContactValidator, validateRequest, updateContact);
router.delete("/:id", deleteContact);

export default router;

