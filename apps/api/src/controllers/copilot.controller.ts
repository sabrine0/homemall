import type { Request, Response } from "express";
import { CopilotService } from "../services/copilot.service.js";

const copilotService = new CopilotService();

export const chatWithCopilot = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as {
    message: string;
    context?: {
      goal?: "rent" | "buy" | "sell" | "invest" | "build" | "manage_rental";
      budgetMin?: number;
      budgetMax?: number;
      workLat?: number | null;
      workLng?: number | null;
      mobilityModes?: string[];
      sensitivities?: {
        noise: number;
        heat: number;
        allergies: number;
      };
    };
  };

  const result = await copilotService.chat(payload);
  res.json(result);
};
