import { clamp, round2, type ScoreReason, type ScoreResult as ScoreResultData } from "@homemall/shared";

export class ScoreResult {
  readonly total: number;
  readonly normalizedTotal: number;
  readonly breakdown: ScoreResultData["breakdown"];
  readonly penalties: string[];
  readonly reasons: ScoreReason[];
  readonly topPositives: string[];
  readonly topRisks: string[];
  readonly assumptions: string[];
  readonly explanations: string[];

  constructor(input: ScoreResultData) {
    if (!Number.isFinite(input.normalizedTotal)) {
      throw new Error("ScoreResult normalizedTotal must be finite.");
    }

    const normalized = clamp(input.normalizedTotal, 0, 1);
    this.normalizedTotal = round2(normalized);
    this.total = round2(normalized * 100);
    this.breakdown = input.breakdown;
    this.penalties = input.penalties;
    this.reasons = input.reasons;
    this.topPositives = input.topPositives.slice(0, 3);
    this.topRisks = input.topRisks.slice(0, 2);
    this.assumptions = input.assumptions;

    const explanationLines = [...this.topPositives, ...this.topRisks, ...this.assumptions];
    this.explanations = explanationLines.length ? explanationLines : input.explanations;
  }

  toJSON(): ScoreResultData {
    return {
      total: this.total,
      normalizedTotal: this.normalizedTotal,
      breakdown: this.breakdown,
      penalties: this.penalties,
      reasons: this.reasons,
      topPositives: this.topPositives,
      topRisks: this.topRisks,
      assumptions: this.assumptions,
      explanations: this.explanations
    };
  }
}
