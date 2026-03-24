import type { SendChatMessageInputDto } from "@homemall/shared";
import type { Request, Response } from "express";
import { ChatService } from "../services/chat.service.js";

const chatService = new ChatService();

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  const conversations = await chatService.listConversations(req.user!.id);
  res.json({ conversations });
};

export const listConversationMessages = async (req: Request, res: Response): Promise<void> => {
  const result = await chatService.listMessages(req.user!.id, req.params.conversationId);
  res.json(result);
};

export const sendConversationMessage = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as SendChatMessageInputDto;
  const message = await chatService.sendMessage(req.user!.id, req.params.conversationId, payload.text);
  res.status(201).json({ message });
};
