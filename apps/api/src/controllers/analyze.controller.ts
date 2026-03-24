import type { Request, Response } from "express";
import { AnalysisService } from "../services/analysis.service.js";
import type { UserProfileInput } from "@homemall/shared";

const analysisService = new AnalysisService();

export const analyzeZones = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as { profile?: UserProfileInput };
  const recommendations = await analysisService.analyzeZones(input.profile);
  res.json({ recommendations });
};

export const analyzeTcl = async (req: Request, res: Response): Promise<void> => {
  const result = await analysisService.analyzeTcl(req.body);
  res.json(result);
};

export const analyzeCompare = async (req: Request, res: Response): Promise<void> => {
  const result = await analysisService.compare(req.body);
  res.json(result);
};
