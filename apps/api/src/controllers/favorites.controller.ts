import type { Request, Response } from "express";
import { FavoritesService } from "../services/favorites.service.js";

const favoritesService = new FavoritesService();

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as { zoneId: string; note?: string };
  const favorite = favoritesService.add(req.user!.id, payload.zoneId, payload.note);
  res.status(201).json({ favorite });
};

export const listFavorites = async (req: Request, res: Response): Promise<void> => {
  const favorites = favoritesService.list(req.user!.id);
  res.json({ favorites });
};
