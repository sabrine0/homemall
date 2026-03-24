import type { UserProfileInput } from "@homemall/shared";

export interface AnalyzeOptionInput {
  label: string;
  zoneId: string;
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
}

export interface AnalyzeTclRequest {
  profile?: UserProfileInput;
  optionA: AnalyzeOptionInput;
  optionB: AnalyzeOptionInput;
}
