import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  me,
  resetPassword,
  signup,
  updateMe,
  verifyForgotPasswordCode
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  authSchema,
  forgotPasswordRequestSchema,
  resetPasswordSchema,
  updateAccountSchema,
  verifyResetCodeSchema
} from "../utils/validation.js";

const router = Router();

router.post("/signup", validateBody(authSchema), signup);
router.post("/login", validateBody(authSchema), login);
router.post("/forgot-password", validateBody(forgotPasswordRequestSchema), forgotPassword);
router.post(
  "/forgot-password/verify",
  validateBody(verifyResetCodeSchema),
  verifyForgotPasswordCode
);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, validateBody(updateAccountSchema), updateMe);
router.post("/logout", logout);

export default router;
