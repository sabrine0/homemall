import type { AnalyzeZoneItem, ReportModel, UserProfileInput } from "@homemall/shared";

export class Report {
  readonly id?: string;
  readonly generatedAt: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly profile: UserProfileInput;
  readonly recommendations: AnalyzeZoneItem[];
  readonly summary: string;

  constructor(input: ReportModel) {
    if (!input.generatedAt) {
      throw new Error("Report generatedAt is required.");
    }
    if (!input.profile) {
      throw new Error("Report profile is required.");
    }
    if (!Array.isArray(input.recommendations)) {
      throw new Error("Report recommendations must be an array.");
    }
    if (!input.summary) {
      throw new Error("Report summary is required.");
    }

    this.id = input.id;
    this.generatedAt = input.generatedAt;
    this.createdAt = input.createdAt;
    this.updatedAt = input.updatedAt;
    this.profile = input.profile;
    this.recommendations = input.recommendations;
    this.summary = input.summary;
  }

  toJSON(): ReportModel {
    return {
      id: this.id,
      generatedAt: this.generatedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profile: this.profile,
      recommendations: this.recommendations,
      summary: this.summary
    };
  }
}
