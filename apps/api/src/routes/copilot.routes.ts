import { Router } from "express";
import { chatWithCopilot } from "../controllers/copilot.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { copilotChatSchema } from "../utils/validation.js";

const router = Router();

router.post("/chat", validateBody(copilotChatSchema), chatWithCopilot);

export default router;
