import type { Request, Response } from "express";
import { ProfileService } from "../services/profile.service.js";

const profileService = new ProfileService();

export const upsertProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.upsert(req.user!.id, req.body);
  res.json({ profile });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getByUser(req.user!.id);
  res.json({ profile });
};
