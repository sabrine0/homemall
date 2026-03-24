declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: "USER" | "SUPER_ADMIN" | "MANAGER";
        isActive?: boolean;
        adminPermissions?: Array<
          | "MANAGE_USERS"
          | "MANAGE_LISTINGS"
          | "MODERATE_REPORTS"
          | "MANAGE_IMPORTS"
          | "MANAGE_SETTINGS"
          | "MANAGE_ADMINS"
        >;
      };
    }
  }
}

export {};
