import { Router } from "express";
import { listConversationMessages, listConversations, sendConversationMessage } from "../controllers/chats.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { sendChatMessageSchema } from "../utils/validation.js";

const router = Router();

router.get("/", requireAuth, listConversations);
router.get("/:conversationId/messages", requireAuth, listConversationMessages);
router.post("/:conversationId/messages", requireAuth, validateBody(sendChatMessageSchema), sendConversationMessage);

export default router;
