import type { ZoneSummary } from "@homemall/shared";
import { ZonesExplorer } from "@/components/zones/zones-explorer";
import { serverApi } from "@/lib/server-api";
import { getServerSessionState } from "@/lib/server-session";

interface ZonesResponse {
  zones: ZoneSummary[];
}

export default async function ZonesPage({
  searchParams,
}: {
  searchParams?: {
    aiQuery?: string;
    goal?: string;
  };
}) {
  const { isAuthenticated } = getServerSessionState();

  let zones: ZoneSummary[] = [];
  try {
    const response = await serverApi<ZonesResponse>("/api/zones");
    zones = response.zones;
  } catch {
    zones = [];
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
      <ZonesExplorer
        initialZones={zones}
        isAuthenticated={isAuthenticated}
        initialAiQuery={searchParams?.aiQuery}
        initialGoal={
          searchParams?.goal === "rent" ||
          searchParams?.goal === "buy" ||
          searchParams?.goal === "sell" ||
          searchParams?.goal === "invest" ||
          searchParams?.goal === "build"
            ? searchParams.goal
            : undefined
        }
      />
    </main>
  );
}
