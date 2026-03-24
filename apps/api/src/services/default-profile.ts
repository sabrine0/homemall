import type { UserProfileInput } from "@homemall/shared";

export const DEFAULT_PROFILE: UserProfileInput = {
  goal: "rent",
  budgetMin: 3000,
  budgetMax: 12000,
  workLat: 33.5731,
  workLng: -7.5898,
  mobilityModes: ["transit", "walk"],
  sensitivities: {
    noise: 2,
    heat: 2,
    allergies: 2
  }
};
