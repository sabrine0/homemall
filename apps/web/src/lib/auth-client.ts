import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { clientApi } from "./client-api";

export const isLoggedInClient = async (): Promise<boolean> => {
  try {
    await clientApi<{ user: { id: string } }>("/api/auth/me");
    return true;
  } catch {
    return false;
  }
};

export const redirectToLoginWithReturn = (
  router: AppRouterInstance,
  returnTo: string,
): void => {
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/zones";
  router.push(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
};
