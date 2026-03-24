import { round2, type TCLBreakdown as TCLBreakdownData } from "@homemall/shared";

const clampCost = (value: number) => Math.max(0, round2(value));

export class TCLBreakdown {
  readonly monthlyTotal: number;
  readonly components: TCLBreakdownData["components"];
  readonly explanations: string[];
  readonly assumptions: string[];

  constructor(input: TCLBreakdownData) {
    if (!Number.isFinite(input.monthlyTotal)) {
      throw new Error("TCLBreakdown monthlyTotal must be finite.");
    }

    const components = {
      housing: clampCost(input.components.housing),
      commute: clampCost(input.components.commute),
      utilities: clampCost(input.components.utilities),
      energy: clampCost(input.components.energy),
      health: clampCost(input.components.health),
      risk: clampCost(input.components.risk),
      riskPenalty: clampCost(input.components.riskPenalty),
      services: clampCost(input.components.services)
    };

    this.components = components;
    this.monthlyTotal = clampCost(
      components.housing +
        components.commute +
        components.utilities +
        components.health +
        components.risk +
        components.services
    );
    this.explanations = input.explanations;
    this.assumptions = input.assumptions;
  }

  toJSON(): TCLBreakdownData {
    return {
      monthlyTotal: this.monthlyTotal,
      components: this.components,
      explanations: this.explanations,
      assumptions: this.assumptions
    };
  }
}
