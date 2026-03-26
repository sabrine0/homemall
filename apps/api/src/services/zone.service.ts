import { computeFutureOutlook, computeZoneScore } from "@homemall/scoring";
import type {
  ListingTypeCounts,
  PropertyListing,
  UserProfileInput,
  ZoneDetails,
  ZoneListingInventory,
  ZoneSummary
} from "@homemall/shared";
import type { ListingPurpose, ListingType } from "@prisma/client";
import { ApiError } from "../middlewares/error.middleware.js";
import { ZoneRepository } from "../repositories/zone.repository.js";
import { ListingRepository, type ListingWithRelations } from "../repositories/listing.repository.js";
import { DEFAULT_PROFILE } from "./default-profile.js";
import { fromPrismaMetrics } from "./mappers.js";
import { normalizeMediaUrl, normalizeMediaUrls } from "../utils/media-url.js";

type CountKey = keyof Omit<ListingTypeCounts, "total">;

const toSharedPurpose = (value: ListingPurpose): "rent" | "buy" =>
  value === "BUY" ? "buy" : "rent";

const toSharedType = (value: ListingType): PropertyListing["type"] => {
  if (value === "HOUSE") return "house";
  if (value === "STUDIO") return "studio";
  if (value === "VILLA") return "villa";
  if (value === "LAND") return "land";
  return "apartment";
};

const toCountKey = (value: ListingType): CountKey => {
  if (value === "HOUSE") return "house";
  if (value === "STUDIO") return "studio";
  if (value === "VILLA") return "villa";
  if (value === "LAND") return "land";
  return "apartment";
};

export class ZoneService {
  private readonly listingTypeKeys: CountKey[] = [
    "apartment",
    "house",
    "studio",
    "villa",
    "land"
  ];

  private readonly placeholderImageHosts = new Set([
    "loremflickr.com",
    "www.loremflickr.com",
    "picsum.photos",
    "placehold.co",
    "dummyimage.com"
  ]);

  private readonly blockedImagePatterns = ["1494526585095-c41746248156"];

  private readonly fallbackGalleryPool = [
    "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/186077/pexels-photo-186077.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1600"
  ] as const;

  private readonly zoneRepository = new ZoneRepository();
  private readonly listingRepository = new ListingRepository();

  private toHostname(value: string): string | undefined {
    try {
      return new URL(value).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }

  private sanitizeImageUrl(value: unknown): string | undefined {
    const text = normalizeMediaUrl(value);
    if (!text) {
      return undefined;
    }

    if (text.startsWith("/uploads/")) {
      return text;
    }

    const lower = text.toLowerCase();
    if (this.blockedImagePatterns.some((pattern) => lower.includes(pattern))) {
      return undefined;
    }

    const hostname = this.toHostname(text);
    if (!hostname || this.placeholderImageHosts.has(hostname)) {
      return undefined;
    }

    return text;
  }

  private deterministicLock(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % 9000) + 1000;
  }

  private buildFallbackGallery(zone: { name: string; city: string }): string[] {
    const lock = this.deterministicLock(`${zone.city}:${zone.name}`);
    const start = lock % this.fallbackGalleryPool.length;
    return Array.from({ length: 4 }, (_, index) => {
      const next = (start + index) % this.fallbackGalleryPool.length;
      return this.fallbackGalleryPool[next];
    });
  }

  private getZoneMeta(zone: { metaJson: unknown }): Record<string, unknown> {
    return zone.metaJson && typeof zone.metaJson === "object"
      ? (zone.metaJson as Record<string, unknown>)
      : {};
  }

  private resolveZoneImageGallery(
    zone: {
      name: string;
      city: string;
      metaJson: unknown;
    },
    featuredListing?: ListingWithRelations
  ): string[] {
    const meta = this.getZoneMeta(zone);
    const listingImagesRaw = Array.isArray(featuredListing?.imageUrls)
      ? featuredListing.imageUrls
      : [];
    const listingImages = listingImagesRaw
      .map((item: unknown) => this.sanitizeImageUrl(item))
      .filter((item): item is string => Boolean(item));

    const metaCandidates = [
      meta.imageUrl,
      meta.listingImageUrl,
      meta.coverImage,
      meta.thumbnailUrl,
      meta.sourceImageUrl
    ]
      .map((item) => this.sanitizeImageUrl(item))
      .filter((item): item is string => Boolean(item));

    const metaGallery = Array.isArray(meta.imageUrls)
      ? meta.imageUrls
          .map((item) => this.sanitizeImageUrl(item))
          .filter((item): item is string => Boolean(item))
      : [];

    const fallback = this.buildFallbackGallery(zone);

    return Array.from(
      new Set([...listingImages, ...metaCandidates, ...metaGallery, ...fallback])
    ).slice(0, 8);
  }

  private resolveZoneImageUrl(
    zone: {
      name: string;
      city: string;
      metaJson: unknown;
    },
    featuredListing?: ListingWithRelations
  ): string {
    const gallery = this.resolveZoneImageGallery(zone, featuredListing);
    return gallery[0];
  }

  private emptyCounts(): Omit<ListingTypeCounts, "total"> {
    return {
      apartment: 0,
      house: 0,
      studio: 0,
      villa: 0,
      land: 0
    };
  }

  private withTotal(counts: Omit<ListingTypeCounts, "total">): ListingTypeCounts {
    return {
      ...counts,
      total: this.listingTypeKeys.reduce((sum, key) => sum + counts[key], 0)
    };
  }

  private emptyInventory(): ZoneListingInventory {
    const empty = this.withTotal(this.emptyCounts());
    return {
      rent: empty,
      buy: empty,
      total: 0,
      source: "database"
    };
  }

  private buildInventoryByZone(
    rows: Array<{
      zoneId: string;
      purpose: ListingPurpose;
      type: ListingType;
      _count: { _all: number };
    }>
  ): Map<string, ZoneListingInventory> {
    const map = new Map<string, ZoneListingInventory>();

    rows.forEach((row) => {
      const current = map.get(row.zoneId) ?? this.emptyInventory();
      const purpose = toSharedPurpose(row.purpose);
      const key = toCountKey(row.type);
      const next = {
        rent: { ...current.rent },
        buy: { ...current.buy },
        total: current.total,
        source: "database"
      };

      next[purpose][key] += row._count._all;
      next[purpose].total += row._count._all;
      next.total = next.rent.total + next.buy.total;

      map.set(row.zoneId, next);
    });

    return map;
  }

  private pickFeaturedByZone(listings: ListingWithRelations[]) {
    const byZone = new Map<string, ListingWithRelations>();
    listings.forEach((listing) => {
      if (!byZone.has(listing.zoneId)) {
        byZone.set(listing.zoneId, listing);
      }
    });
    return byZone;
  }

  private toPropertyListing(listing: ListingWithRelations): PropertyListing {
    const imageUrls = normalizeMediaUrls(listing.imageUrls);

    return {
      id: listing.id,
      zoneId: listing.zoneId,
      title: listing.title,
      type: toSharedType(listing.type),
      purpose: toSharedPurpose(listing.purpose),
      sourcePlatform:
        listing.sourcePlatform === "AVITO"
          ? "avito"
          : listing.sourcePlatform === "MUBAWAB"
            ? "mubawab"
            : listing.sourcePlatform === "OTHER"
              ? "other"
              : "manual",
      sourceListingId: listing.sourceListingId ?? undefined,
      sourceUrl: listing.sourceUrl ?? undefined,
      priceMonthly: listing.priceMonthly ?? undefined,
      priceSale: listing.priceSale ?? undefined,
      areaM2: listing.areaM2 ?? undefined,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      imageUrl: imageUrls[0],
      imageUrls
    };
  }

  async list(profile?: UserProfileInput): Promise<ZoneSummary[]> {
    const zones = await this.zoneRepository.listWithMetrics();
    const activeProfile = profile ?? DEFAULT_PROFILE;
    const zoneIds = zones.map((zone: any) => zone.id);
    const [inventoryRows, activeListings] = await Promise.all([
      this.listingRepository.aggregateActiveInventory(zoneIds),
      this.listingRepository.listTopActiveByZoneIds(zoneIds)
    ]);
    const inventoryByZone = this.buildInventoryByZone(inventoryRows);
    const featuredByZone = this.pickFeaturedByZone(activeListings);

    return zones
      .filter((zone: any) => zone.metrics)
      .map((zone: any) => {
        const metrics = fromPrismaMetrics(zone.metrics);
        const score = computeZoneScore(activeProfile, metrics);
        const featuredListing = featuredByZone.get(zone.id);

        return {
          id: zone.id,
          name: zone.name,
          city: zone.city,
          centerLat: zone.centerLat,
          centerLng: zone.centerLng,
          imageUrl: this.resolveZoneImageUrl(zone, featuredListing),
          imageUrls: this.resolveZoneImageGallery(zone, featuredListing),
          listingInventory: inventoryByZone.get(zone.id) ?? this.emptyInventory(),
          overallScore: score.total,
          flags: {
            quiet: metrics.noiseIndex <= 45,
            transitFriendly: metrics.transitIndex >= 65,
            allergyFriendly:
              metrics.pollenIndex <= 40 && metrics.airQualityIndex >= 65,
            floodRiskHigh: metrics.floodRiskIndex >= 55
          }
        };
      })
      .sort((a: ZoneSummary, b: ZoneSummary) => b.overallScore - a.overallScore);
  }

  async getDetails(zoneId: string, profile?: UserProfileInput): Promise<ZoneDetails> {
    const zone = await this.zoneRepository.findByIdWithMetrics(zoneId);
    if (!zone || !zone.metrics) {
      throw new ApiError(404, "Zone not found");
    }

    const activeProfile = profile ?? DEFAULT_PROFILE;
    const [inventoryRows, activeListings] = await Promise.all([
      this.listingRepository.aggregateActiveInventory([zone.id]),
      this.listingRepository.listTopActiveByZoneIds([zone.id])
    ]);
    const inventoryByZone = this.buildInventoryByZone(inventoryRows);
    const featuredListing = activeListings[0];

    const metrics = fromPrismaMetrics(zone.metrics);
    const score = computeZoneScore(activeProfile, metrics);
    const futureOutlook = computeFutureOutlook(metrics);

    return {
      id: zone.id,
      name: zone.name,
      city: zone.city,
      centerLat: zone.centerLat,
      centerLng: zone.centerLng,
      imageUrl: this.resolveZoneImageUrl(zone, featuredListing),
      imageUrls: this.resolveZoneImageGallery(zone, featuredListing),
      listingInventory: inventoryByZone.get(zone.id) ?? this.emptyInventory(),
      overallScore: score.total,
      flags: {
        quiet: metrics.noiseIndex <= 45,
        transitFriendly: metrics.transitIndex >= 65,
        allergyFriendly: metrics.pollenIndex <= 40 && metrics.airQualityIndex >= 65,
        floodRiskHigh: metrics.floodRiskIndex >= 55
      },
      metrics,
      score,
      futureOutlook,
      listing: featuredListing ? this.toPropertyListing(featuredListing) : undefined
    };
  }

  async getMetricsByZoneId(zoneId: string) {
    const zone = await this.zoneRepository.findByIdWithMetrics(zoneId);
    if (!zone || !zone.metrics) {
      throw new ApiError(404, "Zone not found");
    }
    return {
      zone,
      metrics: fromPrismaMetrics(zone.metrics)
    };
  }

  async listRaw() {
    return this.zoneRepository.listWithMetrics();
  }
}
