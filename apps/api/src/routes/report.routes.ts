import { Router } from "express";
import { getReport, getReportPdf } from "../controllers/report.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getReport);
router.get("/pdf", requireAuth, getReportPdf);

export default router;
