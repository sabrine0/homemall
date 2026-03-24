import { Router } from "express";
import {
  adminLogin,
  createAdminAccount,
  createAdminZone,
  deleteAdminListing,
  deleteAdminZone,
  exportAdminReportsJson,
  getAdminDashboard,
  getAdminZone,
  getAdminZoneMetrics,
  importAdminData,
  refreshMarketplaceData,
  listAdminAccounts,
  listAdminListings,
  listAdminReports,
  listAdminSettings,
  listAdminUsers,
  listAdminZones,
  updateAdminAccount,
  updateAdminListingStatus,
  upsertAdminSetting,
  updateAdminUser,
  updateAdminZone,
  updateAdminZoneMetrics
} from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../middlewares/validate.middleware.js";
import {
  adminCreateUserSchema,
  adminImportSchema,
  adminMarketplaceRefreshSchema,
  adminListingStatusSchema,
  adminListingsQuerySchema,
  adminLoginSchema,
  adminSettingUpsertSchema,
  adminUpdateAdminSchema,
  adminUpdateUserSchema,
  zoneMetricsSchema,
  zoneUpsertSchema
} from "../utils/validation.js";

const router = Router();

router.post("/login", validateBody(adminLoginSchema), adminLogin);

router.use(requireAuth);
router.use(requireAdmin());

router.get("/dashboard", getAdminDashboard);

router.get("/zones", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), listAdminZones);
router.post("/zones", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), validateBody(zoneUpsertSchema), createAdminZone);
router.get("/zones/:id", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), getAdminZone);
router.put("/zones/:id", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), validateBody(zoneUpsertSchema), updateAdminZone);
router.delete("/zones/:id", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), deleteAdminZone);
router.get("/zones/:id/metrics", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), getAdminZoneMetrics);
router.put("/zones/:id/metrics", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), validateBody(zoneMetricsSchema), updateAdminZoneMetrics);

router.post("/import", requireAdmin({ permissions: ["MANAGE_IMPORTS"] }), validateBody(adminImportSchema), importAdminData);
router.post("/import/refresh", requireAdmin({ permissions: ["MANAGE_IMPORTS"] }), validateBody(adminMarketplaceRefreshSchema), refreshMarketplaceData);

router.get("/users", requireAdmin({ permissions: ["MANAGE_USERS"] }), listAdminUsers);
router.patch("/users/:id", requireAdmin({ permissions: ["MANAGE_USERS"] }), validateBody(adminUpdateUserSchema), updateAdminUser);

router.get("/admins", requireAdmin({ roles: ["SUPER_ADMIN"] }), listAdminAccounts);
router.post("/admins", requireAdmin({ roles: ["SUPER_ADMIN"] }), validateBody(adminCreateUserSchema), createAdminAccount);
router.patch("/admins/:id", requireAdmin({ roles: ["SUPER_ADMIN"] }), validateBody(adminUpdateAdminSchema), updateAdminAccount);

router.get("/reports", requireAdmin({ permissions: ["MODERATE_REPORTS"] }), listAdminReports);
router.get("/reports/export", requireAdmin({ permissions: ["MODERATE_REPORTS"] }), exportAdminReportsJson);

router.get("/listings", requireAdmin({ permissions: ["MANAGE_LISTINGS"] }), validateQuery(adminListingsQuerySchema), listAdminListings);
router.patch("/listings/:id/status", requireAdmin({ permissions: ["MANAGE_LISTINGS"] }), validateBody(adminListingStatusSchema), updateAdminListingStatus);
router.delete("/listings/:id", requireAdmin({ permissions: ["MANAGE_LISTINGS"] }), deleteAdminListing);

router.get("/settings", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), listAdminSettings);
router.put("/settings/:key", requireAdmin({ permissions: ["MANAGE_SETTINGS"] }), validateBody(adminSettingUpsertSchema), upsertAdminSetting);

export default router;
