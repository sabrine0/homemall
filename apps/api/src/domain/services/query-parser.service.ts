import { GOAL_WEIGHTS, type AISearchConstraints, type AISearchRequest, type Goal, type ScoreAssumption, type ScoreWeights, type UserProfileInput } from "@homemall/shared";
import { ScoreProfile } from "@homemall/scoring";

export interface ParsedQuery {
  constraints: AISearchConstraints;
  profile: ScoreProfile;
  assumptions: string[];
}

const defaultBudget = {
  min: 3000,
  max: 12000
};

const budgetRangePattern = /\b(\d{3,6})\s*(?:-|to|and)\s*(\d{3,6})\b/i;
const budgetMaxPattern = /\b(?:under|max|up to|<=?)\s*(\d{3,6})\b/i;
const commutePattern = /\b(\d{1,3})\s*(?:min|mins|minutes)\b/i;

const goalFromText = (text: string): Goal | undefined => {
  if (/\binvest|investment\b/i.test(text)) return "invest";
  if (/\bbuild|construction\b/i.test(text)) return "build";
  if (/\bbuy|purchase|mortgage\b/i.test(text)) return "buy";
  if (/\bsell\b/i.test(text)) return "sell";
  if (/\bmanage rental\b/i.test(text)) return "manage_rental";
  if (/\brent|lease\b/i.test(text)) return "rent";
  return undefined;
};

const tuneWeights = (base: ScoreWeights, flags: { quiet: boolean; safe: boolean; lowAllergy: boolean; commute: boolean }) => {
  const next = { ...base };
  if (flags.quiet) {
    next.qualityOfLife += 0.14;
    next.health += 0.05;
  }
  if (flags.safe) {
    next.climateRisk += 0.18;
    next.futureValue += 0.03;
  }
  if (flags.lowAllergy) {
    next.health += 0.2;
  }
  if (flags.commute) {
    next.mobility += 0.18;
    next.services += 0.04;
  }
  return next;
};

export class QueryParserService {
  parse(input: AISearchRequest, availableCities: string[]): ParsedQuery {
    const text = input.query.trim().toLowerCase();
    const assumptions: string[] = [];
    const explicit = input.constraints ?? {};

    const parsedGoal = explicit.goal ?? goalFromText(text) ?? "rent";
    if (!explicit.goal && !goalFromText(text)) {
      assumptions.push("Assumed goal is rent.");
    }

    const rangeMatch = text.match(budgetRangePattern);
    const maxMatch = text.match(budgetMaxPattern);

    let budgetMin = explicit.budgetMin;
    let budgetMax = explicit.budgetMax;
    if (budgetMin === undefined || budgetMax === undefined) {
      if (rangeMatch) {
        budgetMin = Math.min(Number(rangeMatch[1]), Number(rangeMatch[2]));
        budgetMax = Math.max(Number(rangeMatch[1]), Number(rangeMatch[2]));
      } else if (maxMatch) {
        budgetMax = Number(maxMatch[1]);
        budgetMin = Math.round(budgetMax * 0.65);
      }
    }

    if (budgetMin === undefined || budgetMax === undefined) {
      budgetMin = defaultBudget.min;
      budgetMax = defaultBudget.max;
      assumptions.push(`Assumed budget range ${defaultBudget.min}-${defaultBudget.max}.`);
    }

    const matchedCity =
      explicit.city ??
      availableCities
        .sort((a, b) => b.length - a.length)
        .find((city) => new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
    if (!matchedCity) {
      assumptions.push("Assumed search across all cities.");
    }

    const quiet = explicit.quiet ?? /\bquiet|calm|low noise\b/i.test(text);
    const safe = explicit.safe ?? /\bsafe|safety|flood\b/i.test(text);
    const lowAllergy = explicit.lowAllergy ?? /\ballergy|pollen|air quality\b/i.test(text);
    const commute = explicit.maxCommuteMinutes !== undefined || commutePattern.test(text) || /\bcommute|transit|walk\b/i.test(text);
    const commuteMatch = text.match(commutePattern);
    const maxCommuteMinutes = explicit.maxCommuteMinutes ?? (commuteMatch ? Number(commuteMatch[1]) : undefined);

    const weights = tuneWeights(GOAL_WEIGHTS[parsedGoal], { quiet, safe, lowAllergy, commute });
    const scoreAssumptions: ScoreAssumption[] = assumptions.map((assumption, index) => ({
      field: `assumption_${index + 1}`,
      assumedValue: assumption,
      reason: assumption
    }));

    const profileInput: UserProfileInput = {
      goal: parsedGoal,
      budgetMin,
      budgetMax,
      workLat: 33.5731,
      workLng: -7.5898,
      mobilityModes: ["walk", "transit"],
      sensitivities: {
        noise: quiet ? 4 : 2,
        heat: safe ? 2 : 3,
        allergies: lowAllergy ? 4 : 2
      }
    };

    const profile = new ScoreProfile({
      ...profileInput,
      weights,
      preferredCity: matchedCity,
      commuteMaxMinutes: maxCommuteMinutes,
      assumptions: scoreAssumptions
    });

    return {
      constraints: {
        ...explicit,
        city: matchedCity,
        budgetMin,
        budgetMax,
        goal: parsedGoal,
        quiet,
        safe,
        lowAllergy,
        maxCommuteMinutes,
        limit: explicit.limit ?? 10
      },
      profile,
      assumptions
    };
  }
}
