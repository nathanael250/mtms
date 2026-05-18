import { Router } from "express";
import { login, logout, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { loginValidator } from "../validators/auth.validators.js";

const router = Router();

router.post("/login", loginValidator, validateRequest, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;

