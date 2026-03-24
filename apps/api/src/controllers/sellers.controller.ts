import type { Request, Response } from "express";
import { SellerProfileService } from "../services/seller-profile.service.js";

const sellerProfileService = new SellerProfileService();

export const getPublicSellerProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const seller = await sellerProfileService.getPublicProfile(req.params.sellerId);
  res.json({ seller });
};
