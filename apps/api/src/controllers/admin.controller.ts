import type { AdminPermission, UserRole } from "@prisma/client";
import type { ListingPurpose, ListingSourcePlatform, ListingStatus } from "@homemall/shared";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { AuthService } from "../services/auth.service.js";
import { AdminService } from "../services/admin.service.js";

const authService = new AuthService();
const adminService = new AdminService();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7
};

const adminRoles = new Set<UserRole>(["SUPER_ADMIN", "MANAGER"]);

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const payload = await authService.login(email, password);
  if (!adminRoles.has(payload.user.role as UserRole)) {
    throw new ApiError(403, "Admin role required");
  }

  res.cookie(env.COOKIE_NAME, payload.token, cookieOptions);
  res.json({ user: payload.user, token: payload.token });
};

export const getAdminDashboard = async (_req: Request, res: Response): Promise<void> => {
  const stats = await adminService.dashboard();
  res.json(stats);
};

export const listAdminZones = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.listZones({
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
    search: req.query.search as string | undefined
  });
  res.json(result);
};

export const createAdminZone = async (req: Request, res: Response): Promise<void> => {
  const zone = await adminService.createZone(req.body);
  res.status(201).json({ zone });
};

export const getAdminZone = async (req: Request, res: Response): Promise<void> => {
  const zone = await adminService.getZone(req.params.id);
  res.json({ zone });
};

export const updateAdminZone = async (req: Request, res: Response): Promise<void> => {
  const zone = await adminService.updateZone(req.params.id, req.body);
  res.json({ zone });
};

export const deleteAdminZone = async (req: Request, res: Response): Promise<void> => {
  await adminService.deleteZone(req.params.id);
  res.status(204).send();
};

export const getAdminZoneMetrics = async (req: Request, res: Response): Promise<void> => {
  const metrics = await adminService.getZoneMetrics(req.params.id);
  res.json({ metrics });
};

export const updateAdminZoneMetrics = async (req: Request, res: Response): Promise<void> => {
  const metrics = await adminService.upsertZoneMetrics(req.params.id, req.body);
  res.json({ metrics });
};

export const importAdminData = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.importListings(req.body);
  res.json(result);
};

export const refreshMarketplaceData = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as {
    source?: "all" | "avito" | "mubawab";
    maxRows?: number;
    deactivateMissing?: boolean;
  };
  const result = await adminService.refreshMarketplace(payload);
  res.json(result);
};

export const listAdminUsers = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.listUsers({
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
    search: req.query.search as string | undefined
  });
  res.json(result);
};

export const updateAdminUser = async (req: Request, res: Response): Promise<void> => {
  const patch = req.body as {
    role?: UserRole;
    isActive?: boolean;
    adminPermissions?: AdminPermission[];
    displayName?: string;
  };
  const user = await adminService.updateUser(
    req.params.id,
    { userId: req.user!.id, role: req.user!.role as UserRole },
    patch
  );
  res.json({ user });
};

export const listAdminAccounts = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.listAdminUsers({
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
    search: req.query.search as string | undefined
  });
  res.json(result);
};

export const createAdminAccount = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as {
    email: string;
    password: string;
    role: "SUPER_ADMIN" | "MANAGER";
    isActive?: boolean;
    adminPermissions?: AdminPermission[];
  };
  const user = await adminService.createAdminUser(payload);
  res.status(201).json({ user });
};

export const updateAdminAccount = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as {
    role?: "SUPER_ADMIN" | "MANAGER";
    isActive?: boolean;
    adminPermissions?: AdminPermission[];
    displayName?: string;
  };
  const user = await adminService.updateAdminUser(
    req.params.id,
    req.user!.id,
    payload
  );
  res.json({ user });
};

export const listAdminReports = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.listReports({
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined
  });
  res.json(result);
};

export const exportAdminReportsJson = async (_req: Request, res: Response): Promise<void> => {
  const payload = await adminService.exportReportsJson();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename=homemall-reports-${Date.now()}.json`);
  res.json(payload);
};

export const listAdminListings = async (req: Request, res: Response): Promise<void> => {
  const result = await adminService.listListings({
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
    search: req.query.search as string | undefined,
    status: req.query.status as ListingStatus | undefined,
    purpose: req.query.purpose as ListingPurpose | undefined,
    sourcePlatform: req.query.sourcePlatform as ListingSourcePlatform | undefined,
    isExternal: req.query.isExternal as "true" | "false" | undefined
  });
  res.json(result);
};

export const updateAdminListingStatus = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as { status: ListingStatus };
  const listing = await adminService.updateListingStatus(req.params.id, payload.status);
  res.json({ listing });
};

export const deleteAdminListing = async (req: Request, res: Response): Promise<void> => {
  await adminService.deleteListing(req.params.id);
  res.status(204).send();
};

export const listAdminSettings = async (_req: Request, res: Response): Promise<void> => {
  const items = await adminService.listSystemSettings();
  res.json({ items });
};

export const upsertAdminSetting = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as { valueJson: Record<string, unknown>; description?: string };
  const setting = await adminService.upsertSystemSetting(
    req.params.key,
    payload.valueJson,
    payload.description,
    req.user!.id
  );
  res.json({ setting });
};
