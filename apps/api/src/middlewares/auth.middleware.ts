import type { NextFunction, Request, Response } from "express";
import type { AdminPermission, UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import { verifyAuthToken } from "../utils/jwt.js";
import { UserRepository } from "../repositories/user.repository.js";

const userRepository = new UserRepository();
type AdminRole = Extract<UserRole, "SUPER_ADMIN" | "MANAGER">;

export const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "MANAGER"];
export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
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

const extractToken = (req: Request): string | null => {
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.replace("Bearer ", "")
    : null;
  const cookieToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  return headerToken || cookieToken || null;
};

const attachUserFromToken = (req: Request): boolean => {
  const token = extractToken(req);
  if (!token) {
    return false;
  }

  const payload = verifyAuthToken(token);
  req.user = { id: payload.userId, email: payload.email, role: payload.role };
  return true;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const isAttached = attachUserFromToken(req);
    if (!isAttached) {
      throw new ApiError(401, "Authentication required");
    }
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    attachUserFromToken(req);
  } catch {
    // Optional auth should not block guest access when token is invalid.
    req.user = undefined;
  }
  next();
};

const resolvePermissions = (
  role: AdminRole,
  assignedPermissions: AdminPermission[]
): AdminPermission[] => {
  if (role === "SUPER_ADMIN") {
    return ALL_ADMIN_PERMISSIONS;
  }

  return Array.from(
    new Set<AdminPermission>([
      ...DEFAULT_MANAGER_PERMISSIONS,
      ...assignedPermissions
    ])
  );
};

export const requireAdmin =
  (options?: { roles?: AdminRole[]; permissions?: AdminPermission[] }) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new ApiError(401, "Authentication required");
      }

      const user = await userRepository.findById(req.user.id);
      if (!user) {
        throw new ApiError(401, "Authentication required");
      }

      if (!user.isActive) {
        throw new ApiError(403, "Account is disabled");
      }

      if (!ADMIN_ROLES.includes(user.role as AdminRole)) {
        throw new ApiError(403, "Admin role required");
      }

      const role = user.role as AdminRole;
      if (options?.roles && !options.roles.includes(role)) {
        throw new ApiError(403, "Insufficient role permissions");
      }

      const effectivePermissions = resolvePermissions(role, user.adminPermissions);
      if (options?.permissions?.length) {
        const hasAll = options.permissions.every((item) =>
          effectivePermissions.includes(item)
        );
        if (!hasAll) {
          throw new ApiError(403, "Insufficient admin permissions");
        }
      }

      req.user.role = role;
      req.user.isActive = true;
      req.user.adminPermissions = effectivePermissions;
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireRoles = (roles: AdminRole[]) => requireAdmin({ roles });
