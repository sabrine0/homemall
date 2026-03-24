import { average, clamp, round2, type FutureOutlook, type ScoreReason, type ScoreWeights, type ZoneMetrics } from "@homemall/shared";
import { ScoreProfile } from "./ScoreProfile.js";
import { ScoreResult } from "./ScoreResult.js";
import { TCLBreakdown } from "./TCLBreakdown.js";
import { Metric } from "./Metric.js";
import { normalizeMetricValue, type MetricNormalizationRule } from "../services/normalization.js";

type MetricKey = keyof ZoneMetrics;

export interface ZoneProps {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metrics: Partial<ZoneMetrics>;
  metaJson?: Record<string, unknown>;
}

export interface TclInput {
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
}

const metricRules: Record<MetricKey, MetricNormalizationRule> = {
  noiseIndex: { min: 0, max: 100, higherIsBetter: false, missingStrategy: "impute_median", imputeValue: 50 },
  greenIndex: { min: 0, max: 100, higherIsBetter: true, missingStrategy: "impute_median", imputeValue: 50 },
  airQualityIndex: { min: 0, max: 100, higherIsBetter: true, missingStrategy: "impute_median", imputeValue: 60 },
  pollenIndex: { min: 0, max: 100, higherIsBetter: false, missingStrategy: "impute_median", imputeValue: 45 },
  floodRiskIndex: { min: 0, max: 100, higherIsBetter: false, missingStrategy: "penalize", imputeValue: 50 },
  heatIndex: { min: 0, max: 100, higherIsBetter: false, missingStrategy: "impute_median", imputeValue: 50 },
  transitIndex: { min: 0, max: 100, higherIsBetter: true, missingStrategy: "impute_median", imputeValue: 55 },
  walkIndex: { min: 0, max: 100, higherIsBetter: true, missingStrategy: "impute_median", imputeValue: 55 },
  futureValueIndex: { min: 0, max: 100, higherIsBetter: true, missingStrategy: "impute_median", imputeValue: 55 },
  zoningRiskIndex: { min: 0, max: 100, higherIsBetter: false, missingStrategy: "penalize", imputeValue: 45 }
};

const metricLabel: Record<MetricKey, string> = {
  noiseIndex: "noise",
  greenIndex: "green space",
  airQualityIndex: "air quality",
  pollenIndex: "pollen",
  floodRiskIndex: "flood risk",
  heatIndex: "heat exposure",
  transitIndex: "transit",
  walkIndex: "walkability",
  futureValueIndex: "future value",
  zoningRiskIndex: "zoning stability"
};

const pct = (value: number) => round2(value * 100);

export class Zone {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly centerLat: number;
  readonly centerLng: number;
  readonly metaJson: Record<string, unknown>;
  readonly metrics: Partial<Record<MetricKey, Metric>>;

  constructor(input: ZoneProps) {
    if (!input.id || !input.name || !input.city) {
      throw new Error("Zone requires id, name, and city.");
    }
    if (!Number.isFinite(input.centerLat) || !Number.isFinite(input.centerLng)) {
      throw new Error("Zone coordinates must be finite.");
    }

    this.id = input.id;
    this.name = input.name;
    this.city = input.city;
    this.centerLat = input.centerLat;
    this.centerLng = input.centerLng;
    this.metaJson = input.metaJson ?? {};

    const nextMetrics: Partial<Record<MetricKey, Metric>> = {};
    (Object.keys(metricRules) as MetricKey[]).forEach((key) => {
      const raw = input.metrics[key];
      if (raw === undefined || raw === null) {
        return;
      }
      nextMetrics[key] = new Metric({
        key,
        value: raw
      });
    });
    this.metrics = nextMetrics;
  }

  private normalizeAllMetrics() {
    const assumptions: string[] = [];
    const normalized = {} as Record<MetricKey, number>;

    (Object.keys(metricRules) as MetricKey[]).forEach((key) => {
      const metric = this.metrics[key];
      const result = normalizeMetricValue(metricLabel[key], metric?.value, metricRules[key]);
      normalized[key] = result.normalized;
      if (result.assumedReason) {
        assumptions.push(result.assumedReason);
      }
    });

    return { normalized, assumptions };
  }

  private buildDimensionBreakdown(normalized: Record<MetricKey, number>) {
    const breakdown = {
      qualityOfLife: average([normalized.noiseIndex, normalized.greenIndex]),
      mobility: average([normalized.transitIndex, normalized.walkIndex]),
      health: average([normalized.airQualityIndex, normalized.pollenIndex]),
      climateRisk: average([normalized.floodRiskIndex, normalized.heatIndex]),
      services: average([normalized.transitIndex, normalized.walkIndex, normalized.greenIndex]),
      futureValue: average([normalized.futureValueIndex, normalized.zoningRiskIndex])
    };

    return {
      qualityOfLife: round2(breakdown.qualityOfLife * 100),
      mobility: round2(breakdown.mobility * 100),
      health: round2(breakdown.health * 100),
      climateRisk: round2(breakdown.climateRisk * 100),
      services: round2(breakdown.services * 100),
      futureValue: round2(breakdown.futureValue * 100)
    };
  }

  private weightedScore(breakdown: ReturnType<Zone["buildDimensionBreakdown"]>, weights: ScoreWeights) {
    return (
      (breakdown.qualityOfLife / 100) * weights.qualityOfLife +
      (breakdown.mobility / 100) * weights.mobility +
      (breakdown.health / 100) * weights.health +
      (breakdown.climateRisk / 100) * weights.climateRisk +
      (breakdown.services / 100) * weights.services +
      (breakdown.futureValue / 100) * weights.futureValue
    );
  }

  computeScore(profile: ScoreProfile) {
    const { normalized, assumptions: metricAssumptions } = this.normalizeAllMetrics();
    const breakdown = this.buildDimensionBreakdown(normalized);
    const weighted = this.weightedScore(breakdown, profile.weights);

    const allergyPenalty = (1 - normalized.pollenIndex) * (profile.sensitivities.allergies / 5) * 0.12;
    const noisePenalty = (1 - normalized.noiseIndex) * (profile.sensitivities.noise / 5) * 0.1;
    const heatPenalty = (1 - normalized.heatIndex) * (profile.sensitivities.heat / 5) * 0.1;
    const floodPenalty = (1 - normalized.floodRiskIndex) * 0.08;
    const totalPenalty = allergyPenalty + noisePenalty + heatPenalty + floodPenalty;

    const penalties: string[] = [];
    if (allergyPenalty > 0.025) penalties.push("Allergy sensitivity penalty from pollen exposure.");
    if (noisePenalty > 0.025) penalties.push("Noise sensitivity penalty from ambient noise levels.");
    if (heatPenalty > 0.025) penalties.push("Heat sensitivity penalty from heat exposure.");
    if (floodPenalty > 0.03) penalties.push("Flood-risk penalty applied.");

    const positives: Array<{ message: string; impact: number; metric: ScoreReason["metric"] }> = [
      {
        message: `Strong quality of life (${breakdown.qualityOfLife}) driven by ${metricLabel.noiseIndex} and ${metricLabel.greenIndex}.`,
        impact: (breakdown.qualityOfLife / 100) * profile.weights.qualityOfLife,
        metric: "composite" as const
      },
      {
        message: `Good mobility (${breakdown.mobility}) from ${metricLabel.transitIndex} and ${metricLabel.walkIndex}.`,
        impact: (breakdown.mobility / 100) * profile.weights.mobility,
        metric: "composite" as const
      },
      {
        message: `Healthy environment (${breakdown.health}) through ${metricLabel.airQualityIndex} and ${metricLabel.pollenIndex}.`,
        impact: (breakdown.health / 100) * profile.weights.health,
        metric: "composite" as const
      },
      {
        message: `Future upside (${breakdown.futureValue}) from ${metricLabel.futureValueIndex} and ${metricLabel.zoningRiskIndex}.`,
        impact: (breakdown.futureValue / 100) * profile.weights.futureValue,
        metric: "composite" as const
      }
    ].sort((a, b) => b.impact - a.impact);

    const risks: Array<{ message: string; impact: number; metric: ScoreReason["metric"] }> = [
      {
        message: `Climate pressure (${round2((1 - breakdown.climateRisk / 100) * 100)}) influenced by ${metricLabel.floodRiskIndex} and ${metricLabel.heatIndex}.`,
        impact: (1 - breakdown.climateRisk / 100) * profile.weights.climateRisk,
        metric: "composite" as const
      },
      {
        message: `Service friction (${round2((1 - breakdown.services / 100) * 100)}) linked to ${metricLabel.transitIndex} and ${metricLabel.walkIndex}.`,
        impact: (1 - breakdown.services / 100) * profile.weights.services,
        metric: "composite" as const
      },
      {
        message: `Penalties reduced score by ${round2(totalPenalty * 100)} points.`,
        impact: totalPenalty,
        metric: "composite" as const
      }
    ].sort((a, b) => b.impact - a.impact);

    const topPositives = positives.slice(0, 3).map((item) => item.message);
    const topRisks = risks.slice(0, 2).map((item) => item.message);
    const assumptions = [...profile.assumptions.map((item) => `Assumed ${item.field}: ${item.reason}`), ...metricAssumptions];

    const reasons: ScoreReason[] = [
      ...positives.map((item) => ({
        type: "positive" as const,
        metric: item.metric,
        message: item.message,
        impact: round2(item.impact * 100)
      })),
      ...risks.map((item) => ({
        type: "risk" as const,
        metric: item.metric,
        message: item.message,
        impact: round2(item.impact * 100)
      })),
      ...assumptions.map((message) => ({
        type: "assumption" as const,
        metric: "composite" as const,
        message,
        impact: 0
      })),
      ...penalties.map((message) => ({
        type: "penalty" as const,
        metric: "composite" as const,
        message,
        impact: round2(totalPenalty * 100)
      }))
    ];

    const result = new ScoreResult({
      total: pct(clamp(weighted - totalPenalty, 0, 1)),
      normalizedTotal: clamp(weighted - totalPenalty, 0, 1),
      breakdown,
      penalties,
      reasons,
      topPositives,
      topRisks,
      assumptions,
      explanations: [...topPositives, ...topRisks, ...assumptions]
    });

    return result;
  }

  computeTCL(profile: ScoreProfile, option?: Partial<TclInput>) {
    const assumptions: string[] = [];

    const housingCostMonthly =
      option?.housingCostMonthly ??
      (() => {
        assumptions.push("Assumed housing cost from your budget midpoint.");
        return profile.budgetMin + (profile.budgetMax - profile.budgetMin) * 0.55;
      })();

    const commuteKmMonthly =
      option?.commuteKmMonthly ??
      (() => {
        assumptions.push("Assumed commute distance at 360 km/month.");
        return 360;
      })();

    const energyKwhMonthly =
      option?.energyKwhMonthly ??
      (() => {
        assumptions.push("Assumed utilities at 230 kWh/month.");
        return 230;
      })();

    const baselineHealthBudget =
      option?.baselineHealthBudget ??
      (() => {
        assumptions.push("Assumed baseline health spend at 75/month.");
        return 75;
      })();

    const { normalized, assumptions: metricAssumptions } = this.normalizeAllMetrics();
    assumptions.push(...metricAssumptions);

    const commuteMultiplier = profile.mobilityModes.includes("car")
      ? 0.34
      : profile.mobilityModes.includes("transit")
        ? 0.21
        : 0.18;
    const commute = commuteKmMonthly * commuteMultiplier;

    const utilitiesMultiplier = 1 + (1 - normalized.heatIndex) * 0.26;
    const utilities = energyKwhMonthly * 0.22 * utilitiesMultiplier;

    const health =
      baselineHealthBudget +
      (1 - normalized.pollenIndex) * (profile.sensitivities.allergies / 5) * 90 +
      (1 - normalized.airQualityIndex) * 72;

    const risk = (1 - normalized.floodRiskIndex) * 115 + (1 - normalized.zoningRiskIndex) * 58;
    const services = (1 - average([normalized.transitIndex, normalized.walkIndex, normalized.greenIndex])) * 65;

    return new TCLBreakdown({
      monthlyTotal: 0,
      components: {
        housing: housingCostMonthly,
        commute,
        utilities,
        energy: utilities,
        health,
        risk,
        riskPenalty: risk,
        services
      },
      explanations: [
        `Commute cost uses ${profile.mobilityModes.join(", ")} mode assumptions.`,
        "Utilities increase when heat risk is higher.",
        "Health blends baseline budget with pollen and air-quality pressure.",
        "Risk combines flood and zoning volatility signals.",
        "Services estimates opportunity cost from lower accessibility."
      ],
      assumptions
    });
  }

  computeFutureOutlook(): FutureOutlook {
    const { normalized } = this.normalizeAllMetrics();
    const value = normalized.futureValueIndex;
    const climateDrag = (1 - normalized.floodRiskIndex) * 0.08 + (1 - normalized.heatIndex) * 0.05;
    const zoningDrag = (1 - normalized.zoningRiskIndex) * 0.04;

    const annualGrowth = Math.max(-0.03, value * 0.09 - climateDrag - zoningDrag);
    const years5 = Math.pow(1 + annualGrowth, 5) - 1;
    const years10 = Math.pow(1 + annualGrowth, 10) - 1;

    return {
      years5: round2(years5 * 100),
      years10: round2(years10 * 100),
      explanation: `Projected annual growth ${round2(annualGrowth * 100)}% after climate and zoning adjustments.`
    };
  }
}
