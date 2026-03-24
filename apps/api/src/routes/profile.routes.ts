import { Router } from "express";
import { getProfile, upsertProfile } from "../controllers/profile.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { profileSchema } from "../utils/validation.js";

const router = Router();

router.post("/save", requireAuth, validateBody(profileSchema), upsertProfile);
// Keep legacy route for backwards compatibility.
router.post("/", requireAuth, validateBody(profileSchema), upsertProfile);
router.get("/", requireAuth, getProfile);

export default router;
