import { redirect } from "next/navigation";
import type { ZoneSummary } from "@homemall/shared";
import { ListingsWorkspace } from "@/components/listings/listings-workspace";
import { getServerSessionState } from "@/lib/server-session";
import { serverApi } from "@/lib/server-api";

interface ZonesResponse {
  zones: ZoneSummary[];
}

export default async function ListingsPage() {
  const { isAuthenticated } = getServerSessionState();
  if (!isAuthenticated) {
    redirect("/login?returnTo=/listings");
  }

  const response = await serverApi<ZonesResponse>("/api/zones");
  return <ListingsWorkspace zones={response.zones} />;
}
