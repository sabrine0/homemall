import PDFDocument from "pdfkit";
import type { ReportResponse, UserProfileInput } from "@homemall/shared";
import { AnalysisService } from "./analysis.service.js";

export class ReportService {
  private analysisService = new AnalysisService();

  async buildReport(profile: UserProfileInput): Promise<ReportResponse> {
    const recommendations = await this.analysisService.analyzeZones(profile);
    const top = recommendations.slice(0, 3);

    const summary =
      top.length > 0
        ? `Top recommendation is ${top[0].zoneName} with a score of ${top[0].score.total}. The top three zones show strong mobility and future value potential for your selected goal.`
        : "No recommendations available. Seed more zone data and rerun analysis.";

    return {
      generatedAt: new Date().toISOString(),
      profile,
      recommendations,
      summary
    };
  }

  async buildPdf(report: ReportResponse): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 48 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).text("HomeMall Decision Report", { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`Generated at: ${report.generatedAt}`);
      doc.text(`Goal: ${report.profile.goal}`);
      doc.text(`Budget range: ${report.profile.budgetMin} - ${report.profile.budgetMax}`);
      doc.moveDown();
      doc.text(report.summary);
      doc.moveDown();
      doc.fontSize(14).text("Top Zones");
      doc.moveDown(0.5);

      report.recommendations.slice(0, 5).forEach((zone: ReportResponse["recommendations"][number], index: number) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${zone.zoneName} (${zone.city}) | Score ${zone.score.total} | Future ${zone.metrics.futureValueIndex}`
          );
      });

      doc.end();
    });
  }
}
