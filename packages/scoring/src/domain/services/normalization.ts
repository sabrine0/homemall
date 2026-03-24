import { clamp } from "@homemall/shared";

export type MissingDataStrategy = "impute_median" | "penalize";

export interface MetricNormalizationRule {
  min: number;
  max: number;
  higherIsBetter: boolean;
  missingStrategy: MissingDataStrategy;
  imputeValue: number;
}

export interface NormalizedMetric {
  rawValue: number;
  normalized: number;
  missing: boolean;
  assumedReason?: string;
}

export const normalizeMinMax = (
  value: number,
  rule: Pick<MetricNormalizationRule, "min" | "max" | "higherIsBetter">
) => {
  if (rule.max <= rule.min) {
    return 0.5;
  }

  const ratio = clamp((value - rule.min) / (rule.max - rule.min), 0, 1);
  return rule.higherIsBetter ? ratio : 1 - ratio;
};

export const normalizeMetricValue = (
  metricName: string,
  rawValue: number | null | undefined,
  rule: MetricNormalizationRule
): NormalizedMetric => {
  if (rawValue !== undefined && rawValue !== null && Number.isFinite(rawValue)) {
    return {
      rawValue,
      normalized: normalizeMinMax(rawValue, rule),
      missing: false
    };
  }

  if (rule.missingStrategy === "impute_median") {
    return {
      rawValue: rule.imputeValue,
      normalized: normalizeMinMax(rule.imputeValue, rule),
      missing: true,
      assumedReason: `Missing ${metricName}. Imputed with baseline ${rule.imputeValue}.`
    };
  }

  const pessimistic = rule.higherIsBetter ? 0.25 : 0.75;
  return {
    rawValue: rule.imputeValue,
    normalized: rule.higherIsBetter ? pessimistic : 1 - pessimistic,
    missing: true,
    assumedReason: `Missing ${metricName}. Applied conservative penalty.`
  };
};
