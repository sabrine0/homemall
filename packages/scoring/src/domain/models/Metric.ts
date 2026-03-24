export type MetricSource = "observed" | "imputed";

export class Metric {
  readonly key: string;
  readonly value: number;
  readonly source: MetricSource;

  constructor(input: { key: string; value: number; source?: MetricSource }) {
    if (!input.key || typeof input.key !== "string") {
      throw new Error("Metric key is required.");
    }
    if (!Number.isFinite(input.value)) {
      throw new Error(`Metric ${input.key} must be a finite number.`);
    }

    this.key = input.key;
    this.value = input.value;
    this.source = input.source ?? "observed";
  }
}
