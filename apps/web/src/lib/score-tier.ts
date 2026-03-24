export type ScoreTier = "best" | "medium" | "worst";

export interface ScoreRange {
  min: number;
  max: number;
}

export interface ScoreTierInfo {
  tier: ScoreTier;
  label: "Best" | "Medium" | "Worst";
  color: string;
}

const SCORE_COLORS: Record<ScoreTier, string> = {
  best: "#1f9d55",
  medium: "#f59e0b",
  worst: "#dc2626",
};

const isFlatRange = (range: ScoreRange) =>
  Math.abs(range.max - range.min) < 0.001;

export const getScoreRange = (scores: number[]): ScoreRange => {
  if (!scores.length) {
    return { min: 0, max: 0 };
  }

  return {
    min: Math.min(...scores),
    max: Math.max(...scores),
  };
};

export const getScoreTierInfo = (
  score: number,
  range: ScoreRange,
): ScoreTierInfo => {
  if (isFlatRange(range)) {
    return {
      tier: "medium",
      label: "Medium",
      color: SCORE_COLORS.medium,
    };
  }

  const normalized = (score - range.min) / (range.max - range.min);
  if (normalized >= 0.66) {
    return {
      tier: "best",
      label: "Best",
      color: SCORE_COLORS.best,
    };
  }
  if (normalized <= 0.33) {
    return {
      tier: "worst",
      label: "Worst",
      color: SCORE_COLORS.worst,
    };
  }
  return {
    tier: "medium",
    label: "Medium",
    color: SCORE_COLORS.medium,
  };
};

export const withAlpha = (hexColor: string, alpha: number) => {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) {
    return hexColor;
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(clampedAlpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${alphaHex}`;
};
