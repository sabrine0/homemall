import { Router } from "express";
import { validateBody } from "../../../middlewares/validate.middleware.js";
import { aiSearchRequestSchema } from "../../../utils/validation.js";
import { searchWithAI } from "../controllers/ai-search.controller.js";

const router = Router();

router.post("/ai", validateBody(aiSearchRequestSchema), searchWithAI);

export default router;
