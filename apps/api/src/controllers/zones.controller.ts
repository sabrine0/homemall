import type { Request, Response } from "express";
import { ProfileService } from "../services/profile.service.js";
import { ZoneService } from "../services/zone.service.js";

const zoneService = new ZoneService();
const profileService = new ProfileService();

export const listZones = async (req: Request, res: Response): Promise<void> => {
  const profile = req.user ? await profileService.maybeGetByUser(req.user.id) : null;
  const zones = await zoneService.list(profile ?? undefined);
  res.json({ zones });
};

export const getZoneDetails = async (req: Request, res: Response): Promise<void> => {
  const profile = req.user ? await profileService.maybeGetByUser(req.user.id) : null;
  const zone = await zoneService.getDetails(req.params.id, profile ?? undefined);
  res.json({ zone });
};
