import { prisma } from "../../config/prisma.js";

export interface ZoneWithMetricsRecord {
  id: string;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  metaJson: Record<string, unknown>;
  featuredListing: {
    id: string;
    title: string;
    type: "APARTMENT" | "HOUSE" | "STUDIO" | "VILLA" | "LAND";
    purpose: "RENT" | "BUY";
    sourcePlatform: "MANUAL" | "AVITO" | "MUBAWAB" | "OTHER";
    sourceListingId: string | null;
    sourceUrl: string | null;
    priceMonthly: number | null;
    priceSale: number | null;
    areaM2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    imageUrls: unknown;
  } | null;
  metrics: {
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
  } | null;
}

export class ZoneAnalysisRepository {
  async listZonesWithMetrics(): Promise<ZoneWithMetricsRecord[]> {
    const zones = await prisma.zone.findMany({
      include: {
        metrics: true,
        listings: {
          where: {
            status: "ACTIVE"
          },
          orderBy: {
            updatedAt: "desc"
          },
          take: 1,
          select: {
            id: true,
            title: true,
            type: true,
            purpose: true,
            sourcePlatform: true,
            sourceListingId: true,
            sourceUrl: true,
            priceMonthly: true,
            priceSale: true,
            areaM2: true,
            bedrooms: true,
            bathrooms: true,
            imageUrls: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      city: zone.city,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      metaJson: (zone.metaJson ?? {}) as Record<string, unknown>,
      featuredListing: zone.listings[0] ?? null,
      metrics: zone.metrics
        ? {
            noiseIndex: zone.metrics.noiseIndex,
            greenIndex: zone.metrics.greenIndex,
            airQualityIndex: zone.metrics.airQualityIndex,
            pollenIndex: zone.metrics.pollenIndex,
            floodRiskIndex: zone.metrics.floodRiskIndex,
            heatIndex: zone.metrics.heatIndex,
            transitIndex: zone.metrics.transitIndex,
            walkIndex: zone.metrics.walkIndex,
            futureValueIndex: zone.metrics.futureValueIndex,
            zoningRiskIndex: zone.metrics.zoningRiskIndex
          }
        : null
    }));
  }
}
