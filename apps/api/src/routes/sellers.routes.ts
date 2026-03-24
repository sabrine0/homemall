import { Router } from "express";
import { getPublicSellerProfile } from "../controllers/sellers.controller.js";

const router = Router();

router.get("/:sellerId", getPublicSellerProfile);

export default router;
