import type { Request, Response } from "express";
import type { AISearchRequest } from "@homemall/shared";
import { AISearchUseCase } from "../../../application/use-cases/ai-search.use-case.js";

const useCase = new AISearchUseCase();

export const searchWithAI = async (req: Request, res: Response): Promise<void> => {
  const result = await useCase.execute(req.body as AISearchRequest);
  res.json(result);
};
