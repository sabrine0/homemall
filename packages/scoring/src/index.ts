import type { FutureOutlook, TCLResult, UserProfileInput, ZoneMetrics, ZoneScoreResult } from "@homemall/shared";
import { ZoneAnalysisService } from "./application/services/zone-analysis.service.js";
export { Metric } from "./domain/models/Metric.js";
export { PropertyListing } from "./domain/models/PropertyListing.js";
export { Report } from "./domain/models/Report.js";
export { ScoreProfile } from "./domain/models/ScoreProfile.js";
export { ScoreResult } from "./domain/models/ScoreResult.js";
export { TCLBreakdown } from "./domain/models/TCLBreakdown.js";
export { Zone } from "./domain/models/Zone.js";
export type { TclInput } from "./domain/models/Zone.js";
export type { MetricNormalizationRule, MissingDataStrategy, NormalizedMetric } from "./domain/services/normalization.js";
export { normalizeMetricValue, normalizeMinMax } from "./domain/services/normalization.js";

const service = new ZoneAnalysisService();

export const computeZoneScore = (profile: UserProfileInput, zoneMetrics: ZoneMetrics): ZoneScoreResult => {
  return service.computeZoneScore(profile, zoneMetrics);
};

interface TCLOption {
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
}

export const computeTCL = (profile: UserProfileInput, option: TCLOption, zoneMetrics: ZoneMetrics): TCLResult => {
  return service.computeTCL(profile, option, zoneMetrics);
};

export const computeFutureOutlook = (zoneMetrics: ZoneMetrics): FutureOutlook => {
  return service.computeFutureOutlook(zoneMetrics);
};
