import type {
  AdminPermission,
  UserRole
} from "@prisma/client";
import type { ListingPurpose, ListingSourcePlatform, ListingStatus } from "@homemall/shared";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import { ExternalListingIngestionService, type ExternalIngestionPayload } from "./external-listing-ingestion.service.js";
import { ListingService } from "./listing.service.js";
import { MarketplaceSyncService } from "./marketplace/marketplace-sync.service.js";
import { hashPassword } from "../utils/password.js";

interface ZoneInput {
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metaJson: Record<string, unknown>;
}

interface ZoneMetricsInput {
  noiseIndex: number;
  greenIndex: number;
  airQualityIndex: number;
  pollenIndex: number;
  floodRiskIndex: number;
  heatIndex: number;
  transitIndex: number;
  walkIndex: number;
  futureValueIndex: number;
  zoningRiskIndex: number;
}

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER"];
const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS",
  "MANAGE_IMPORTS",
  "MANAGE_SETTINGS",
  "MANAGE_ADMINS"
];
const DEFAULT_MANAGER_PERMISSIONS: AdminPermission[] = [
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS"
];

export class AdminService {
  private readonly repository = new AdminRepository();
  private readonly listingService = new ListingService();
  private readonly externalIngestionService = new ExternalListingIngestionService();
  private readonly marketplaceSyncService = new MarketplaceSyncService();

  private parsePaging(input: { page?: string; limit?: string }) {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(input.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  private sanitizePermissions(input: unknown): AdminPermission[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return Array.from(
      new Set(
        input.filter((item): item is AdminPermission =>
          ALL_ADMIN_PERMISSIONS.includes(item as AdminPermission)
        )
      )
    );
  }

  private normalizeAdminRole(role: string): UserRole {
    if (role === "SUPER_ADMIN" || role === "MANAGER") {
      return role;
    }
    throw new ApiError(400, "role must be SUPER_ADMIN or MANAGER");
  }

  private ensureAdminRole(role: UserRole) {
    if (!ADMIN_ROLES.includes(role)) {
      throw new ApiError(400, "Admin role required");
    }
  }

  private async ensureLastSuperAdminNotRemoved(
    targetUserId: string,
    patch: { role?: UserRole; isActive?: boolean }
  ) {
    const target = await this.repository.getUserById(targetUserId);
    if (!target) {
      throw new ApiError(404, "User not found");
    }
    if (target.role !== "SUPER_ADMIN") {
      return;
    }

    const removingSuperRole = patch.role && patch.role !== "SUPER_ADMIN";
    const disablingSuper = patch.isActive === false;
    if (!removingSuperRole && !disablingSuper) {
      return;
    }

    const activeSuperAdmins = await prisma.user.count({
      where: {
        role: "SUPER_ADMIN",
        isActive: true
      }
    });
    if (activeSuperAdmins <= 1) {
      throw new ApiError(400, "At least one active super admin is required");
    }
  }

  async dashboard() {
    return this.repository.dashboardStats();
  }

  async listZones(input: { page?: string; limit?: string; search?: string }) {
    const paging = this.parsePaging(input);
    const { items, total } = await this.repository.listZones({
      search: input.search,
      skip: paging.skip,
      take: paging.limit
    });

    return {
      items,
      total,
      page: paging.page,
      limit: paging.limit,
      pages: Math.max(1, Math.ceil(total / paging.limit))
    };
  }

  async createZone(input: ZoneInput) {
    return this.repository.createZone(input);
  }

  async getZone(id: string) {
    const zone = await this.repository.getZone(id);
    if (!zone) {
      throw new ApiError(404, "Zone not found");
    }
    return zone;
  }

  async updateZone(id: string, input: ZoneInput) {
    await this.getZone(id);
    return this.repository.updateZone(id, input);
  }

  async deleteZone(id: string) {
    await this.getZone(id);
    await this.repository.deleteZone(id);
  }

  async getZoneMetrics(zoneId: string) {
    await this.getZone(zoneId);
    return this.repository.getZoneMetrics(zoneId);
  }

  async upsertZoneMetrics(zoneId: string, input: ZoneMetricsInput) {
    await this.getZone(zoneId);
    return this.repository.upsertZoneMetrics(zoneId, input);
  }

  async importListings(payload: ExternalIngestionPayload) {
    return this.externalIngestionService.ingest(payload);
  }

  async refreshMarketplace(input?: {
    source?: "all" | "avito" | "mubawab";
    maxRows?: number;
    deactivateMissing?: boolean;
  }) {
    const source = input?.source ?? "all";
    const options = {
      maxRows: input?.maxRows,
      deactivateMissing: input?.deactivateMissing
    };

    if (source === "avito") {
      return {
        refreshedAt: new Date().toISOString(),
        avito: await this.marketplaceSyncService.refreshSource("avito", options)
      };
    }
    if (source === "mubawab") {
      return {
        refreshedAt: new Date().toISOString(),
        mubawab: await this.marketplaceSyncService.refreshSource("mubawab", options)
      };
    }
    return this.marketplaceSyncService.refreshAll(options);
  }

  async listUsers(input: { page?: string; limit?: string; search?: string }) {
    const paging = this.parsePaging(input);
    const { items, total } = await this.repository.listUsers({
      search: input.search,
      skip: paging.skip,
      take: paging.limit
    });

    return {
      items,
      total,
      page: paging.page,
      limit: paging.limit,
      pages: Math.max(1, Math.ceil(total / paging.limit))
    };
  }

  async updateUser(
    userId: string,
    actor: { userId: string; role: UserRole },
    patch: {
      role?: UserRole;
      isActive?: boolean;
      adminPermissions?: AdminPermission[];
      displayName?: string;
    }
  ) {
    const user = await this.repository.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (actor.role !== "SUPER_ADMIN") {
      if (user.role !== "USER") {
        throw new ApiError(403, "Only super admins can modify admin accounts");
      }
      if (patch.role && patch.role !== "USER") {
        throw new ApiError(403, "Only super admins can assign admin roles");
      }
      if (patch.adminPermissions !== undefined) {
        throw new ApiError(403, "Only super admins can change permissions");
      }
    }

    const role = patch.role ?? user.role;
    const adminPermissions = this.sanitizePermissions(
      patch.adminPermissions ?? user.adminPermissions
    );
    const permissions =
      role === "MANAGER"
        ? Array.from(new Set([...DEFAULT_MANAGER_PERMISSIONS, ...adminPermissions]))
        : role === "SUPER_ADMIN"
          ? ALL_ADMIN_PERMISSIONS
          : [];

    if (role === "SUPER_ADMIN" || role === "MANAGER") {
      await this.ensureLastSuperAdminNotRemoved(userId, {
        role: patch.role,
        isActive: patch.isActive
      });
    }

    const updated = await this.repository.updateUserAccess(userId, {
      role,
      isActive: patch.isActive,
      adminPermissions: permissions,
      displayName:
        patch.displayName === undefined ? undefined : patch.displayName.trim() || null
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      adminPermissions: updated.adminPermissions,
      displayName: updated.displayName ?? undefined
    };
  }

  async listAdminUsers(input: { page?: string; limit?: string; search?: string }) {
    const paging = this.parsePaging(input);
    const { items, total } = await this.repository.listAdminUsers({
      search: input.search,
      skip: paging.skip,
      take: paging.limit
    });

    return {
      items,
      total,
      page: paging.page,
      limit: paging.limit,
      pages: Math.max(1, Math.ceil(total / paging.limit))
    };
  }

  async createAdminUser(input: {
    email: string;
    password: string;
    role: "SUPER_ADMIN" | "MANAGER";
    isActive?: boolean;
    adminPermissions?: AdminPermission[];
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.getUserByEmail(email);
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }

    const role = this.normalizeAdminRole(input.role);
    this.ensureAdminRole(role);
    const passwordHash = await hashPassword(input.password);
    const requestedPermissions = this.sanitizePermissions(input.adminPermissions);
    const adminPermissions =
      role === "SUPER_ADMIN"
        ? ALL_ADMIN_PERMISSIONS
        : Array.from(
            new Set([...DEFAULT_MANAGER_PERMISSIONS, ...requestedPermissions])
          );

    const user = await this.repository.createAdminUser({
      email,
      passwordHash,
      role,
      isActive: input.isActive ?? true,
      adminPermissions
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      adminPermissions: user.adminPermissions,
      createdAt: user.createdAt
    };
  }

  async updateAdminUser(
    targetUserId: string,
    actorUserId: string,
    patch: {
      role?: "SUPER_ADMIN" | "MANAGER";
      isActive?: boolean;
      adminPermissions?: AdminPermission[];
      displayName?: string;
    }
  ) {
    const target = await this.repository.getUserById(targetUserId);
    if (!target) {
      throw new ApiError(404, "Admin user not found");
    }
    this.ensureAdminRole(target.role);

    const nextRole = patch.role ? this.normalizeAdminRole(patch.role) : target.role;
    this.ensureAdminRole(nextRole);

    if (actorUserId === targetUserId && patch.isActive === false) {
      throw new ApiError(400, "You cannot disable your own admin account");
    }
    if (actorUserId === targetUserId && nextRole !== "SUPER_ADMIN") {
      throw new ApiError(400, "You cannot demote your own super admin account");
    }

    await this.ensureLastSuperAdminNotRemoved(targetUserId, {
      role: nextRole,
      isActive: patch.isActive
    });

    const requestedPermissions = this.sanitizePermissions(
      patch.adminPermissions ?? target.adminPermissions
    );
    const adminPermissions =
      nextRole === "SUPER_ADMIN"
        ? ALL_ADMIN_PERMISSIONS
        : Array.from(
            new Set([...DEFAULT_MANAGER_PERMISSIONS, ...requestedPermissions])
          );

    const updated = await this.repository.updateUserAccess(targetUserId, {
      role: nextRole,
      isActive: patch.isActive,
      adminPermissions,
      displayName:
        patch.displayName === undefined ? undefined : patch.displayName.trim() || null
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      adminPermissions: updated.adminPermissions,
      displayName: updated.displayName ?? undefined
    };
  }

  async listReports(input: { page?: string; limit?: string }) {
    const paging = this.parsePaging(input);
    const { items, total } = await this.repository.listReports({
      skip: paging.skip,
      take: paging.limit
    });

    return {
      items,
      total,
      page: paging.page,
      limit: paging.limit,
      pages: Math.max(1, Math.ceil(total / paging.limit))
    };
  }

  async exportReportsJson() {
    const items = await this.repository.exportReportsJson();
    return {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items
    };
  }

  async listListings(input: {
    page?: string;
    limit?: string;
    search?: string;
    status?: ListingStatus;
    purpose?: ListingPurpose;
    sourcePlatform?: ListingSourcePlatform;
    isExternal?: "true" | "false";
  }) {
    return this.listingService.listForAdmin(input);
  }

  async updateListingStatus(listingId: string, status: ListingStatus) {
    return this.listingService.updateListingStatusByAdmin(listingId, status);
  }

  async deleteListing(listingId: string) {
    return this.listingService.deleteListingByAdmin(listingId);
  }

  async listSystemSettings() {
    return this.repository.listSystemSettings();
  }

  async upsertSystemSetting(
    key: string,
    valueJson: Record<string, unknown>,
    description: string | undefined,
    userId: string
  ) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) {
      throw new ApiError(400, "Setting key is required");
    }
    return this.repository.upsertSystemSetting({
      key: normalizedKey,
      valueJson,
      description: description?.trim() || undefined,
      updatedById: userId
    });
  }
}
