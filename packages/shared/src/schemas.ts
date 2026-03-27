import { z } from "zod";

const goalSchema = z.enum(["rent", "buy", "sell", "invest", "build", "manage_rental"]);

const optionalProfileDisplayNameSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .refine((value) => value === undefined || value.length === 0 || value.length >= 2, {
    message: "displayName must be at least 2 characters when provided"
  });

const optionalProfileUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .refine((value) => value === undefined || value.length === 0 || z.string().url().safeParse(value).success, {
    message: "Must be a valid URL"
  });

const optionalProfilePhoneSchema = z
  .string()
  .trim()
  .max(32)
  .optional()
  .refine((value) => value === undefined || value.length === 0 || value.length >= 6, {
    message: "contactPhone must be at least 6 characters when provided"
  });

const optionalProfileHandleSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .refine((value) => value === undefined || value.length === 0 || value.length >= 2, {
    message: "Handle must be at least 2 characters when provided"
  });

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const userRoleSchema = z.enum(["USER", "SUPER_ADMIN", "MANAGER"]);
export const adminPermissionSchema = z.enum([
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS",
  "MANAGE_IMPORTS",
  "MANAGE_SETTINGS",
  "MANAGE_ADMINS"
]);

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email()
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/, { message: "code must be 6 digits" })
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/, { message: "code must be 6 digits" }),
  newPassword: z.string().min(8)
});

export const updateAccountSchema = z
  .object({
    displayName: optionalProfileDisplayNameSchema,
    avatarUrl: optionalProfileUrlSchema,
    contactPhone: optionalProfilePhoneSchema,
    contactWhatsApp: optionalProfilePhoneSchema,
    contactInstagram: optionalProfileHandleSchema,
    contactFacebook: optionalProfileHandleSchema,
    contactWebsite: optionalProfileUrlSchema
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one account field must be provided"
  });

export const sensitivitiesSchema = z.object({
  noise: z.number().min(0).max(5),
  heat: z.number().min(0).max(5),
  allergies: z.number().min(0).max(5)
});

export const userProfileSchema = z
  .object({
    goal: goalSchema,
    budgetMin: z.number().min(0),
    budgetMax: z.number().positive(),
    workLat: z.number(),
    workLng: z.number(),
    mobilityModes: z.array(z.string().min(1)).min(1),
    sensitivities: sensitivitiesSchema
  })
  .refine((value) => value.budgetMax >= value.budgetMin, {
    message: "budgetMax must be greater than or equal to budgetMin",
    path: ["budgetMax"]
  });

export const analyzeOptionSchema = z.object({
  label: z.string().min(1),
  zoneId: z.string().min(1),
  housingCostMonthly: z.number().min(0),
  commuteKmMonthly: z.number().min(0),
  energyKwhMonthly: z.number().min(0),
  baselineHealthBudget: z.number().min(0)
});

export const analyzeZonesSchema = z.object({
  profile: userProfileSchema.optional()
});

export const analyzeTclSchema = z.object({
  profile: userProfileSchema.optional(),
  optionA: analyzeOptionSchema,
  optionB: analyzeOptionSchema
});

export const compareSchema = analyzeTclSchema;

export const favoriteSchema = z.object({
  zoneId: z.string().min(1),
  note: z.string().max(280).optional()
});

export const listingPurposeSchema = z.enum(["rent", "buy"]);
export const listingPropertyTypeSchema = z.enum(["apartment", "house", "studio", "villa", "land"]);
export const listingStatusSchema = z.enum(["active", "paused", "closed"]);
const listingContactHandleSchema = z.string().trim().min(2).max(200);
const listingMediaUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) =>
      value.startsWith("/uploads/") || z.string().url().safeParse(value).success,
    {
      message: "Invalid url"
    }
  );
const listingZoneDraftSchema = z.object({
  name: z.string().trim().min(2).max(140),
  city: z.string().trim().min(2).max(120),
  centerLat: z.number(),
  centerLng: z.number(),
  formattedAddress: z.string().trim().min(3).max(240).optional(),
  googlePlaceId: z.string().trim().min(1).max(200).optional()
});

export const createListingSchema = z
  .object({
    zoneId: z.string().min(1).optional(),
    zoneDraft: listingZoneDraftSchema.optional(),
    title: z.string().min(3).max(140),
    description: z.string().trim().min(5).max(2000).optional(),
    type: listingPropertyTypeSchema,
    purpose: listingPurposeSchema,
    priceMonthly: z.number().positive().optional(),
    priceSale: z.number().positive().optional(),
    areaM2: z.number().positive().max(50000).optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    imageUrls: z.array(listingMediaUrlSchema).min(1).max(10),
    contactPhone: z.string().trim().min(6).max(32).optional(),
    contactEmail: z.string().trim().email().max(320).optional(),
    contactWhatsApp: z.string().trim().min(6).max(32).optional(),
    contactInstagram: listingContactHandleSchema.optional(),
    contactFacebook: listingContactHandleSchema.optional(),
    contactWebsite: z.string().trim().url().max(2000).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.zoneId && !value.zoneDraft) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zoneId"],
        message: "zoneId or zoneDraft is required"
      });
    }

    if (value.purpose === "rent" && value.priceMonthly === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceMonthly"],
        message: "priceMonthly is required for rent listings"
      });
    }

    if (value.purpose === "buy" && value.priceSale === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceSale"],
        message: "priceSale is required for buy/sell listings"
      });
    }
  });

export const updateListingSchema = z
  .object({
    title: z.string().min(3).max(140).optional(),
    description: z.string().trim().min(5).max(2000).optional(),
    type: listingPropertyTypeSchema.optional(),
    purpose: listingPurposeSchema.optional(),
    priceMonthly: z.number().positive().optional(),
    priceSale: z.number().positive().optional(),
    areaM2: z.number().positive().max(50000).optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    imageUrls: z.array(listingMediaUrlSchema).min(1).max(10).optional(),
    contactPhone: z.string().trim().min(6).max(32).optional(),
    contactEmail: z.string().trim().email().max(320).optional(),
    contactWhatsApp: z.string().trim().min(6).max(32).optional(),
    contactInstagram: listingContactHandleSchema.optional(),
    contactFacebook: listingContactHandleSchema.optional(),
    contactWebsite: z.string().trim().url().max(2000).optional(),
    status: listingStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one listing field must be provided"
  });

export const listingsQuerySchema = z.object({
  zoneId: z.string().min(1).optional(),
  purpose: listingPurposeSchema.optional(),
  mine: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const contactSellerSchema = z.object({
  initialMessage: z.string().trim().min(1).max(1000).optional()
});

export const reportListingSchema = z.object({
  reason: z.string().trim().min(3).max(1000)
});

export const sendChatMessageSchema = z.object({
  text: z.string().trim().min(1).max(1000)
});

export const zoneUpsertSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  centerLat: z.number(),
  centerLng: z.number(),
  metaJson: z.record(z.unknown()).default({})
});

export const zoneMetricsSchema = z.object({
  noiseIndex: z.number().min(0).max(100),
  greenIndex: z.number().min(0).max(100),
  airQualityIndex: z.number().min(0).max(100),
  pollenIndex: z.number().min(0).max(100),
  floodRiskIndex: z.number().min(0).max(100),
  heatIndex: z.number().min(0).max(100),
  transitIndex: z.number().min(0).max(100),
  walkIndex: z.number().min(0).max(100),
  futureValueIndex: z.number().min(0).max(100),
  zoningRiskIndex: z.number().min(0).max(100)
});

export const adminImportSchema = z.object({
  format: z.enum(["csv", "json"]),
  source: z.enum(["generic", "avito", "mubawab"]).default("generic"),
  content: z.string().min(2),
  deactivateMissing: z.boolean().optional()
});

export const adminMarketplaceRefreshSchema = z.object({
  source: z.enum(["all", "avito", "mubawab"]).default("all"),
  maxRows: z.number().int().min(20).max(500).optional(),
  deactivateMissing: z.boolean().optional()
});

export const adminListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  status: listingStatusSchema.optional(),
  purpose: listingPurposeSchema.optional(),
  sourcePlatform: z.enum(["manual", "avito", "mubawab", "other"]).optional(),
  isExternal: z.enum(["true", "false"]).optional()
});

export const adminListingStatusSchema = z.object({
  status: listingStatusSchema
});

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "MANAGER"]).default("MANAGER"),
  isActive: z.boolean().optional(),
  adminPermissions: z.array(adminPermissionSchema).optional()
});

export const adminUpdateAdminSchema = z
  .object({
    role: z.enum(["SUPER_ADMIN", "MANAGER"]).optional(),
    isActive: z.boolean().optional(),
    adminPermissions: z.array(adminPermissionSchema).optional(),
    displayName: optionalProfileDisplayNameSchema
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one admin field must be provided"
  });

export const adminUpdateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    adminPermissions: z.array(adminPermissionSchema).optional(),
    displayName: optionalProfileDisplayNameSchema
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one user field must be provided"
  });

export const adminSettingUpsertSchema = z.object({
  valueJson: z.record(z.unknown()),
  description: z.string().trim().max(280).optional()
});

export const copilotContextSchema = z.object({
  goal: goalSchema.optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  workLat: z.number().nullable().optional(),
  workLng: z.number().nullable().optional(),
  mobilityModes: z.array(z.string().min(1)).optional(),
  sensitivities: sensitivitiesSchema.optional()
});

export const copilotChatSchema = z.object({
  message: z.string().min(2),
  context: copilotContextSchema.optional()
});

export const aiSearchConstraintsSchema = z
  .object({
    city: z.string().min(2).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().positive().optional(),
    goal: goalSchema.optional(),
    rentOrBuy: z.enum(["rent", "buy"]).optional(),
    quiet: z.boolean().optional(),
    safe: z.boolean().optional(),
    lowAllergy: z.boolean().optional(),
    maxCommuteMinutes: z.number().int().min(5).max(240).optional(),
    priorities: z.array(z.string().min(2)).max(10).optional(),
    limit: z.number().int().min(1).max(50).optional()
  })
  .refine((value) => value.budgetMin === undefined || value.budgetMax === undefined || value.budgetMax >= value.budgetMin, {
    message: "budgetMax must be greater than or equal to budgetMin",
    path: ["budgetMax"]
  });

export const aiSearchRequestSchema = z.object({
  query: z.string().min(2),
  constraints: aiSearchConstraintsSchema.optional()
});

export const scoreWeightsSchema = z
  .object({
    qualityOfLife: z.number().min(0),
    mobility: z.number().min(0),
    health: z.number().min(0),
    climateRisk: z.number().min(0),
    services: z.number().min(0),
    futureValue: z.number().min(0)
  })
  .refine((value) => Object.values(value).some((item) => item > 0), {
    message: "At least one score weight must be greater than 0"
  });

export const scoreProfileSchema = z.object({
  goal: goalSchema,
  weights: scoreWeightsSchema,
  budgetMin: z.number().min(0),
  budgetMax: z.number().positive(),
  workLat: z.number(),
  workLng: z.number(),
  mobilityModes: z.array(z.string()).min(1),
  sensitivities: sensitivitiesSchema,
  preferredCity: z.string().optional(),
  commuteMaxMinutes: z.number().int().min(5).max(240).optional(),
  assumptions: z
    .array(
      z.object({
        field: z.string().min(1),
        assumedValue: z.union([z.string(), z.number(), z.boolean()]),
        reason: z.string().min(1)
      })
    )
    .default([])
});

export type AuthInputDto = z.infer<typeof authSchema>;
export type ForgotPasswordRequestInputDto = z.infer<typeof forgotPasswordRequestSchema>;
export type VerifyResetCodeInputDto = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInputDto = z.infer<typeof resetPasswordSchema>;
export type UpdateAccountInputDto = z.infer<typeof updateAccountSchema>;
export type UserProfileInputDto = z.infer<typeof userProfileSchema>;
export type AnalyzeOptionInputDto = z.infer<typeof analyzeOptionSchema>;
export type AnalyzeTclInputDto = z.infer<typeof analyzeTclSchema>;
export type AISearchInputDto = z.infer<typeof aiSearchRequestSchema>;
export type CreateListingInputDto = z.infer<typeof createListingSchema>;
export type UpdateListingInputDto = z.infer<typeof updateListingSchema>;
export type ListingsQueryDto = z.infer<typeof listingsQuerySchema>;
export type ContactSellerInputDto = z.infer<typeof contactSellerSchema>;
export type ReportListingInputDto = z.infer<typeof reportListingSchema>;
export type SendChatMessageInputDto = z.infer<typeof sendChatMessageSchema>;
export type AdminCreateUserInputDto = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateAdminInputDto = z.infer<typeof adminUpdateAdminSchema>;
export type AdminUpdateUserInputDto = z.infer<typeof adminUpdateUserSchema>;
export type AdminListingsQueryInputDto = z.infer<typeof adminListingsQuerySchema>;
export type AdminListingStatusInputDto = z.infer<typeof adminListingStatusSchema>;
export type AdminSettingUpsertInputDto = z.infer<typeof adminSettingUpsertSchema>;
export type AdminMarketplaceRefreshInputDto = z.infer<typeof adminMarketplaceRefreshSchema>;
