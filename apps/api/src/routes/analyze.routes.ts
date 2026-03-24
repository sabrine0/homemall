import { Router } from "express";
import { analyzeCompare, analyzeTcl, analyzeZones } from "../controllers/analyze.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { analyzeTclSchema, analyzeZonesSchema, compareSchema } from "../utils/validation.js";

const router = Router();

router.post("/zones", validateBody(analyzeZonesSchema), analyzeZones);
router.post("/tcl", validateBody(analyzeTclSchema), analyzeTcl);
router.post("/compare", validateBody(compareSchema), analyzeCompare);

export default router;
