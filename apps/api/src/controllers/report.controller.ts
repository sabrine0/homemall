import type { Request, Response } from "express";
import { ProfileService } from "../services/profile.service.js";
import { ReportService } from "../services/report.service.js";

const profileService = new ProfileService();
const reportService = new ReportService();

export const getReport = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getByUser(req.user!.id);
  const report = await reportService.buildReport(profile);
  res.json(report);
};

export const getReportPdf = async (req: Request, res: Response): Promise<void> => {
  const profile = await profileService.getByUser(req.user!.id);
  const report = await reportService.buildReport(profile);
  const pdf = await reportService.buildPdf(report);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=homemall-report-${Date.now()}.pdf`);
  res.send(pdf);
};
