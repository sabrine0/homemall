import { GOAL_WEIGHTS, type ScoreAssumption, type ScoreProfile as ScoreProfileData, type ScoreWeights, type UserProfileInput } from "@homemall/shared";

const normalizeWeights = (weights: ScoreWeights): ScoreWeights => {
  const safeWeights: ScoreWeights = {
    qualityOfLife: Math.max(0, weights.qualityOfLife),
    mobility: Math.max(0, weights.mobility),
    health: Math.max(0, weights.health),
    climateRisk: Math.max(0, weights.climateRisk),
    services: Math.max(0, weights.services),
    futureValue: Math.max(0, weights.futureValue)
  };

  const total = Object.values(safeWeights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return {
      qualityOfLife: 1 / 6,
      mobility: 1 / 6,
      health: 1 / 6,
      climateRisk: 1 / 6,
      services: 1 / 6,
      futureValue: 1 / 6
    };
  }

  return {
    qualityOfLife: safeWeights.qualityOfLife / total,
    mobility: safeWeights.mobility / total,
    health: safeWeights.health / total,
    climateRisk: safeWeights.climateRisk / total,
    services: safeWeights.services / total,
    futureValue: safeWeights.futureValue / total
  };
};

export class ScoreProfile {
  readonly goal: ScoreProfileData["goal"];
  readonly weights: ScoreWeights;
  readonly budgetMin: number;
  readonly budgetMax: number;
  readonly workLat: number;
  readonly workLng: number;
  readonly mobilityModes: string[];
  readonly sensitivities: ScoreProfileData["sensitivities"];
  readonly preferredCity?: string;
  readonly commuteMaxMinutes?: number;
  readonly assumptions: ScoreAssumption[];

  constructor(input: ScoreProfileData) {
    if (!Number.isFinite(input.budgetMin) || !Number.isFinite(input.budgetMax) || input.budgetMax < input.budgetMin) {
      throw new Error("ScoreProfile budget range is invalid.");
    }
    if (!Array.isArray(input.mobilityModes) || input.mobilityModes.length < 1) {
      throw new Error("ScoreProfile mobilityModes must include at least one mode.");
    }
    this.goal = input.goal;
    this.weights = normalizeWeights(input.weights);
    this.budgetMin = input.budgetMin;
    this.budgetMax = input.budgetMax;
    this.workLat = input.workLat;
    this.workLng = input.workLng;
    this.mobilityModes = input.mobilityModes;
    this.sensitivities = input.sensitivities;
    this.preferredCity = input.preferredCity;
    this.commuteMaxMinutes = input.commuteMaxMinutes;
    this.assumptions = input.assumptions ?? [];
  }

  static fromUserProfile(input: UserProfileInput, assumptions: ScoreAssumption[] = []) {
    const goalWeights = GOAL_WEIGHTS[input.goal];
    return new ScoreProfile({
      goal: input.goal,
      weights: goalWeights,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      workLat: input.workLat,
      workLng: input.workLng,
      mobilityModes: input.mobilityModes,
      sensitivities: input.sensitivities,
      assumptions
    });
  }
}
