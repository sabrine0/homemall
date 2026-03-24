import { Router } from "express";
import { getZoneDetails, listZones } from "../controllers/zones.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, listZones);
router.get("/:id", optionalAuth, getZoneDetails);

export default router;
