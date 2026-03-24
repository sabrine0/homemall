import type { UserProfileInput, ZoneMetrics } from "@homemall/shared";

interface PrismaProfileLike {
  goal: string;
  budgetMin: number;
  budgetMax: number;
  workLat: number;
  workLng: number;
  mobilityModes: unknown;
  sensitivities: unknown;
}

interface PrismaMetricsLike {
  noiseIndex: number;
  greenIndex: number;
  airQualityIndex: number;
  pollenIndex: number;
  floodRiskIndex: number;
  heatIndex: number;
  transitIndex: number;
  walkIndex: number;
  futureValueIndex: number;
  zoningRiskIndex: number;
}

export const fromPrismaProfile = (profile: PrismaProfileLike): UserProfileInput => {
  return {
    goal: profile.goal as UserProfileInput["goal"],
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    workLat: profile.workLat,
    workLng: profile.workLng,
    mobilityModes: profile.mobilityModes as string[],
    sensitivities: profile.sensitivities as UserProfileInput["sensitivities"]
  };
};

export const fromPrismaMetrics = (metrics: PrismaMetricsLike): ZoneMetrics => {
  return {
    noiseIndex: metrics.noiseIndex,
    greenIndex: metrics.greenIndex,
    airQualityIndex: metrics.airQualityIndex,
    pollenIndex: metrics.pollenIndex,
    floodRiskIndex: metrics.floodRiskIndex,
    heatIndex: metrics.heatIndex,
    transitIndex: metrics.transitIndex,
    walkIndex: metrics.walkIndex,
    futureValueIndex: metrics.futureValueIndex,
    zoningRiskIndex: metrics.zoningRiskIndex
  };
};
