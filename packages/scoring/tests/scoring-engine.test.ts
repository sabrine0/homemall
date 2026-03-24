import assert from "node:assert/strict";
import test from "node:test";
import type { UserProfileInput, ZoneMetrics } from "@homemall/shared";
import { ScoreProfile, Zone, normalizeMetricValue, normalizeMinMax } from "../src/index.js";

const baseProfile: UserProfileInput = {
  goal: "rent",
  budgetMin: 900,
  budgetMax: 2200,
  workLat: 33.5731,
  workLng: -7.5898,
  mobilityModes: ["walk", "transit"],
  sensitivities: {
    noise: 2,
    heat: 2,
    allergies: 2
  }
};

const baseMetrics: ZoneMetrics = {
  noiseIndex: 38,
  greenIndex: 72,
  airQualityIndex: 76,
  pollenIndex: 28,
  floodRiskIndex: 24,
  heatIndex: 41,
  transitIndex: 78,
  walkIndex: 74,
  futureValueIndex: 67,
  zoningRiskIndex: 30
};

const createZone = (metrics: Partial<ZoneMetrics> = baseMetrics) =>
  new Zone({
    id: "zone-test",
    name: "Test Zone",
    city: "Rabat",
    centerLat: 33.57,
    centerLng: -7.58,
    metrics
  });

test("normalizeMinMax handles direct and inverse scales", () => {
  assert.equal(normalizeMinMax(50, { min: 0, max: 100, higherIsBetter: true }), 0.5);
  assert.equal(normalizeMinMax(50, { min: 0, max: 100, higherIsBetter: false }), 0.5);
  assert.equal(normalizeMinMax(100, { min: 0, max: 100, higherIsBetter: false }), 0);
});

test("normalizeMetricValue imputes missing metrics with reason", () => {
  const normalized = normalizeMetricValue("green space", undefined, {
    min: 0,
    max: 100,
    higherIsBetter: true,
    missingStrategy: "impute_median",
    imputeValue: 52
  });

  assert.equal(normalized.missing, true);
  assert.ok(normalized.assumedReason?.includes("Missing green space"));
  assert.equal(normalized.rawValue, 52);
});

test("ScoreProfile auto-normalizes non-normalized weight sums", () => {
  const profile = new ScoreProfile({
    ...baseProfile,
    weights: {
      qualityOfLife: 10,
      mobility: 10,
      health: 10,
      climateRisk: 10,
      services: 10,
      futureValue: 10
    },
    assumptions: []
  });

  const sum = Object.values(profile.weights).reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(sum - 1) < 0.000001);
});

test("Zone.computeScore is deterministic for same inputs", () => {
  const profile = ScoreProfile.fromUserProfile(baseProfile);
  const zone = createZone();

  const a = zone.computeScore(profile).toJSON();
  const b = zone.computeScore(profile).toJSON();
  assert.deepEqual(a, b);
});

test("Zone.computeScore returns bounded score and explainability fields", () => {
  const profile = ScoreProfile.fromUserProfile(baseProfile);
  const zone = createZone();
  const result = zone.computeScore(profile).toJSON();

  assert.ok(result.total >= 0 && result.total <= 100);
  assert.ok(result.normalizedTotal >= 0 && result.normalizedTotal <= 1);
  assert.ok(result.topPositives.length <= 3);
  assert.ok(result.topRisks.length <= 2);
  assert.ok(result.explanations.length > 0);
});

test("Zone.computeScore emits assumptions when metrics are missing", () => {
  const profile = ScoreProfile.fromUserProfile(baseProfile);
  const sparseZone = createZone({
    noiseIndex: 30,
    greenIndex: 70
  });
  const result = sparseZone.computeScore(profile).toJSON();

  assert.ok(result.assumptions.length > 0);
  assert.ok(result.assumptions.some((line) => line.includes("Missing")));
});

test("Higher sensitivities reduce score when risk metrics are high", () => {
  const riskyZone = createZone({
    ...baseMetrics,
    pollenIndex: 82,
    noiseIndex: 82,
    heatIndex: 79
  });

  const lowSensitivity = ScoreProfile.fromUserProfile({
    ...baseProfile,
    sensitivities: { noise: 0, heat: 0, allergies: 0 }
  });
  const highSensitivity = ScoreProfile.fromUserProfile({
    ...baseProfile,
    sensitivities: { noise: 5, heat: 5, allergies: 5 }
  });

  const lowScore = riskyZone.computeScore(lowSensitivity).toJSON().total;
  const highScore = riskyZone.computeScore(highSensitivity).toJSON().total;

  assert.ok(highScore < lowScore);
});

test("Zone.computeTCL returns positive components and consistent total", () => {
  const profile = ScoreProfile.fromUserProfile(baseProfile);
  const tcl = createZone().computeTCL(profile).toJSON();

  assert.ok(tcl.components.housing > 0);
  assert.ok(tcl.components.commute > 0);
  assert.ok(tcl.components.utilities > 0);
  assert.ok(tcl.components.health > 0);
  assert.ok(tcl.components.risk >= 0);
  assert.ok(tcl.monthlyTotal > 0);
});

test("Zone.computeTCL risk component rises with higher flood/zoning risks", () => {
  const profile = ScoreProfile.fromUserProfile(baseProfile);
  const lowRisk = createZone({
    ...baseMetrics,
    floodRiskIndex: 15,
    zoningRiskIndex: 15
  })
    .computeTCL(profile)
    .toJSON();
  const highRisk = createZone({
    ...baseMetrics,
    floodRiskIndex: 88,
    zoningRiskIndex: 82
  })
    .computeTCL(profile)
    .toJSON();

  assert.ok(highRisk.components.risk > lowRisk.components.risk);
});

test("Zone.computeFutureOutlook rewards strong value and low risks", () => {
  const optimistic = createZone({
    ...baseMetrics,
    futureValueIndex: 90,
    floodRiskIndex: 10,
    heatIndex: 15,
    zoningRiskIndex: 10
  }).computeFutureOutlook();

  assert.ok(optimistic.years10 >= optimistic.years5);
});

test("Zone.computeFutureOutlook penalizes weak value and high risks", () => {
  const pessimistic = createZone({
    ...baseMetrics,
    futureValueIndex: 20,
    floodRiskIndex: 90,
    heatIndex: 92,
    zoningRiskIndex: 85
  }).computeFutureOutlook();

  assert.ok(pessimistic.years10 <= pessimistic.years5);
});
