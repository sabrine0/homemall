import { computeFutureOutlook, computeTCL, computeZoneScore } from "@homemall/scoring";
import type { AnalyzeZoneItem, CompareResponse, UserProfileInput } from "@homemall/shared";
import type { AnalyzeOptionInput, AnalyzeTclRequest } from "../types/analyze.js";
import { AnalysisRepository } from "../repositories/analysis.repository.js";
import { DEFAULT_PROFILE } from "./default-profile.js";
import { ZoneService } from "./zone.service.js";

export class AnalysisService {
  private zoneService = new ZoneService();
  private analysisRepository = new AnalysisRepository();

  private resolveProfile(profile?: UserProfileInput): UserProfileInput {
    return profile ?? DEFAULT_PROFILE;
  }

  async analyzeZones(profile?: UserProfileInput, limit = 10): Promise<AnalyzeZoneItem[]> {
    const zones = await this.zoneService.listRaw();
    const activeProfile = this.resolveProfile(profile);

    const scored = zones
      .filter((item: any) => item.metrics)
      .map((item: any) => {
        const metrics = {
          noiseIndex: item.metrics!.noiseIndex,
          greenIndex: item.metrics!.greenIndex,
          airQualityIndex: item.metrics!.airQualityIndex,
          pollenIndex: item.metrics!.pollenIndex,
          floodRiskIndex: item.metrics!.floodRiskIndex,
          heatIndex: item.metrics!.heatIndex,
          transitIndex: item.metrics!.transitIndex,
          walkIndex: item.metrics!.walkIndex,
          futureValueIndex: item.metrics!.futureValueIndex,
          zoningRiskIndex: item.metrics!.zoningRiskIndex
        };

        return {
          zoneId: item.id,
          zoneName: item.name,
          city: item.city,
          score: computeZoneScore(activeProfile, metrics),
          metrics
        };
      })
      .sort((a: AnalyzeZoneItem, b: AnalyzeZoneItem) => b.score.total - a.score.total);

    if (limit <= 0) {
      return scored;
    }

    return scored.slice(0, limit);
  }

  private async computeOption(profile: UserProfileInput, option: AnalyzeOptionInput) {
    const { zone, metrics } = await this.zoneService.getMetricsByZoneId(option.zoneId);
    const score = computeZoneScore(profile, metrics);
    const tcl = computeTCL(profile, option, metrics);
    const future = computeFutureOutlook(metrics);

    return {
      zone,
      score,
      tcl,
      future,
      option
    };
  }

  async analyzeTcl(input: AnalyzeTclRequest) {
    const profile = this.resolveProfile(input.profile);
    const [a, b] = await Promise.all([
      this.computeOption(profile, input.optionA),
      this.computeOption(profile, input.optionB)
    ]);

    return {
      optionA: {
        label: input.optionA.label,
        zoneId: a.zone.id,
        zoneName: a.zone.name,
        tcl: a.tcl
      },
      optionB: {
        label: input.optionB.label,
        zoneId: b.zone.id,
        zoneName: b.zone.name,
        tcl: b.tcl
      },
      cheaper: a.tcl.monthlyTotal <= b.tcl.monthlyTotal ? "A" : "B",
      deltaMonthly: Math.abs(a.tcl.monthlyTotal - b.tcl.monthlyTotal)
    };
  }

  async compare(input: AnalyzeTclRequest): Promise<CompareResponse> {
    const profile = this.resolveProfile(input.profile);
    const [a, b] = await Promise.all([
      this.computeOption(profile, input.optionA),
      this.computeOption(profile, input.optionB)
    ]);

    const utilityA = a.score.total - a.tcl.monthlyTotal / 100;
    const utilityB = b.score.total - b.tcl.monthlyTotal / 100;

    const winner = utilityA >= utilityB ? "A" : "B";

    return {
      winner,
      reason:
        winner === "A"
          ? `${input.optionA.label} wins with stronger blended score-to-cost utility.`
          : `${input.optionB.label} wins with stronger blended score-to-cost utility.`,
      optionA: {
        label: input.optionA.label,
        score: a.score,
        tcl: a.tcl,
        future: a.future
      },
      optionB: {
        label: input.optionB.label,
        score: b.score,
        tcl: b.tcl,
        future: b.future
      }
    };
  }

  async persistAnalysis(userId: string, zoneId: string, scoreJson: unknown, tclJson: unknown) {
    await this.analysisRepository.create(userId, zoneId, scoreJson, tclJson);
  }

  async latestByUser(userId: string) {
    return this.analysisRepository.latestByUser(userId);
  }
}
