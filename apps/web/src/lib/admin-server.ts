import type { AdminPermission, UserRole } from "@homemall/shared";
import { redirect } from "next/navigation";
import { serverApi } from "./server-api";

const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER"];

interface MeResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    adminPermissions: AdminPermission[];
    createdAt: string;
  };
}

export const requireAdminUser = async () => {
  try {
    const payload = await serverApi<MeResponse>("/api/auth/me");
    if (!payload.user.isActive || !ALLOWED_ROLES.includes(payload.user.role)) {
      redirect("/admin/login");
    }
    return payload.user;
  } catch {
    redirect("/admin/login");
  }
};
