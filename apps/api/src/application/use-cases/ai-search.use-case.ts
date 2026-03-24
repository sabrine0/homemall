import type { AISearchRequest, AISearchResponse, AISearchZoneResult, PropertyListing } from "@homemall/shared";
import { Zone } from "@homemall/scoring";
import { QueryParserService } from "../../domain/services/query-parser.service.js";
import { ZoneAnalysisRepository } from "../../infrastructure/repositories/zone-analysis.repository.js";

const normalizeText = (value: string) => value.trim().toLowerCase();
const formatMonthly = (value: number) => `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Math.round(value))} DH/month`;

const scoreLabel = (score: number): AISearchZoneResult["simpleScoreLabel"] => {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Risky";
};

const buildListing = (
  zoneId: string,
  listing: {
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
  } | null
): PropertyListing | undefined => {
  if (!listing) {
    return undefined;
  }

  const imageUrls = Array.isArray(listing.imageUrls)
    ? listing.imageUrls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    id: listing.id || `listing-${zoneId}`,
    zoneId,
    title: listing.title,
    type:
      listing.type === "HOUSE"
        ? "house"
        : listing.type === "STUDIO"
          ? "studio"
          : listing.type === "VILLA"
            ? "villa"
            : listing.type === "LAND"
              ? "land"
              : "apartment",
    purpose: listing.purpose === "BUY" ? "buy" : "rent",
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
};

export class AISearchUseCase {
  constructor(
    private readonly repository: ZoneAnalysisRepository = new ZoneAnalysisRepository(),
    private readonly parser: QueryParserService = new QueryParserService()
  ) {}

  async execute(input: AISearchRequest): Promise<AISearchResponse> {
    const zones = await this.repository.listZonesWithMetrics();
    const cityList = Array.from(new Set(zones.map((zone) => zone.city))).map((city) => city.toLowerCase());
    const parsed = this.parser.parse(input, cityList);

    const budgetMidpoint = (parsed.profile.budgetMin + parsed.profile.budgetMax) / 2;

    const filteredZones = zones
      .filter((zone) => zone.metrics)
      .filter((zone) => {
        if (!parsed.constraints.city) return true;
        return normalizeText(zone.city).includes(normalizeText(parsed.constraints.city));
      });

    const results: AISearchZoneResult[] = filteredZones
      .map((zone) => {
        const zoneModel = new Zone({
          id: zone.id,
          name: zone.name,
          city: zone.city,
          centerLat: zone.centerLat,
          centerLng: zone.centerLng,
          metaJson: zone.metaJson,
          metrics: zone.metrics ?? {}
        });

        const score = zoneModel.computeScore(parsed.profile).toJSON();
        const tcl = zoneModel
          .computeTCL(parsed.profile, {
            housingCostMonthly: budgetMidpoint,
            commuteKmMonthly: 360,
            energyKwhMonthly: 230,
            baselineHealthBudget: 75
          })
          .toJSON();
        const future = zoneModel.computeFutureOutlook();

        return {
          zoneId: zone.id,
          zoneName: zone.name,
          city: zone.city,
          score,
          tcl,
          future,
          listing: buildListing(zone.id, zone.featuredListing),
          reasons: [...score.topPositives, ...score.topRisks].slice(0, 5),
          simpleScoreLabel: scoreLabel(score.total),
          monthlyCostLabel: formatMonthly(tcl.monthlyTotal),
          easySummary: `${zone.name} is a ${scoreLabel(score.total).toLowerCase()} match with an estimated cost of ${formatMonthly(
            tcl.monthlyTotal
          )}.`
        };
      })
      .sort((a, b) => {
        if (b.score.total !== a.score.total) {
          return b.score.total - a.score.total;
        }
        return a.tcl.monthlyTotal - b.tcl.monthlyTotal;
      });

    const limited = results.slice(0, parsed.constraints.limit ?? 10);

    return {
      query: input.query,
      parsedConstraints: parsed.constraints,
      assumptions: parsed.assumptions,
      results: limited
    };
  }
}
