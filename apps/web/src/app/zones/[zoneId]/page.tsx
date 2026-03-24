import Link from "next/link";
import type { ZoneDetails, ZoneSummary } from "@homemall/shared";
import { ZoneDetailsTabs } from "@/components/zones/zone-details-tabs";
import { serverApi } from "@/lib/server-api";
import { getServerSessionState } from "@/lib/server-session";

interface ZoneDetailResponse {
  zone: ZoneDetails;
}

interface ZonesResponse {
  zones: ZoneSummary[];
}

export default async function ZoneDetailsPage({
  params,
}: {
  params: {
    zoneId: string;
  };
}) {
  const { isAuthenticated } = getServerSessionState();
  const [{ zone }, { zones }] = await Promise.all([
    serverApi<ZoneDetailResponse>(`/api/zones/${params.zoneId}`),
    serverApi<ZonesResponse>("/api/zones"),
  ]);

  const relatedZones = zones
    .filter((candidate) => candidate.id !== zone.id)
    .sort((a, b) => {
      const sameCityA =
        a.city.toLowerCase() === zone.city.toLowerCase() ? 0 : 1;
      const sameCityB =
        b.city.toLowerCase() === zone.city.toLowerCase() ? 0 : 1;
      if (sameCityA !== sameCityB) {
        return sameCityA - sameCityB;
      }

      const scoreDistanceA = Math.abs(a.overallScore - zone.overallScore);
      const scoreDistanceB = Math.abs(b.overallScore - zone.overallScore);
      if (scoreDistanceA !== scoreDistanceB) {
        return scoreDistanceA - scoreDistanceB;
      }

      return b.overallScore - a.overallScore;
    })
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-6 md:px-6">
      <div className="mb-4">
        <Link
          href="/zones"
          className="text-sm font-semibold text-brand-700 underline"
        >
          Back to zone explorer
        </Link>
      </div>
      <ZoneDetailsTabs
        zone={zone}
        relatedZones={relatedZones}
        isAuthenticated={isAuthenticated}
      />
    </main>
  );
}
