import { createHash } from "node:crypto";
import type {
  ListingPurpose,
  ListingSourcePlatform,
  ListingType,
  Prisma
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { ListingRepository } from "../repositories/listing.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { hashPassword } from "../utils/password.js";

export type ExternalImportSource = "generic" | "avito" | "mubawab";

export interface ExternalIngestionPayload {
  format: "csv" | "json";
  source: ExternalImportSource;
  content: string;
  deactivateMissing?: boolean;
}

export interface ExternalIngestionResult {
  parsed: number;
  source: ExternalImportSource;
  createdZones: number;
  updatedZones: number;
  createdListings: number;
  updatedListings: number;
  metricsUpdated: number;
  staleListingsPaused: number;
  errors: Array<{ row: number; message: string }>;
}

type ZoneMetricsInput = {
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
};

type ParsedListingRow = {
  zoneName: string;
  city: string;
  centerLat: number;
  centerLng: number;
  zoneMeta: Record<string, unknown>;
  listing: {
    title: string;
    description?: string;
    type: ListingType;
    purpose: ListingPurpose;
    status: "ACTIVE";
    sourcePlatform: ListingSourcePlatform;
    sourceName: string;
    sourceUrl?: string;
    sourceListingId: string;
    externalReference: Prisma.InputJsonValue;
    importedAt: Date;
    lastSeenAt: Date;
    priceMonthly?: number;
    priceSale?: number;
    areaM2?: number;
    bedrooms?: number;
    bathrooms?: number;
    imageUrls: string[];
    contactPhone?: string;
    contactEmail?: string;
    contactWhatsApp?: string;
    contactInstagram?: string;
    contactFacebook?: string;
    contactWebsite?: string;
  };
  metrics: ZoneMetricsInput;
};

const CITY_CENTER: Record<string, { lat: number; lng: number }> = {
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  sale: { lat: 34.0372, lng: -6.7985 },
  fes: { lat: 34.0331, lng: -5.0003 },
  meknes: { lat: 33.8731, lng: -5.5407 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  tangier: { lat: 35.7595, lng: -5.834 },
  tanger: { lat: 35.7595, lng: -5.834 },
  tetouan: { lat: 35.5785, lng: -5.3684 },
  oujda: { lat: 34.6814, lng: -1.9086 },
  kenitra: { lat: 34.261, lng: -6.5802 },
  temara: { lat: 33.9287, lng: -6.9066 },
  "el jadida": { lat: 33.2316, lng: -8.5007 },
  mohammedia: { lat: 33.6874, lng: -7.382 },
  dakhla: { lat: 23.6848, lng: -15.957 },
  laayoune: { lat: 27.1536, lng: -13.2033 }
};

export class ExternalListingIngestionService {
  private readonly listingRepository = new ListingRepository();
  private readonly userRepository = new UserRepository();

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  private parseCsv(content: string): Record<string, string>[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (const line of lines.slice(1)) {
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      rows.push(row);
    }

    return rows;
  }

  private parseRows(payload: ExternalIngestionPayload): Record<string, unknown>[] {
    if (payload.format === "json") {
      const parsed = JSON.parse(payload.content) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as Record<string, unknown>[];
      }
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown[] }).rows)) {
        return (parsed as { rows: Record<string, unknown>[] }).rows;
      }

      throw new ApiError(400, "JSON import must be an array or { rows: [] }");
    }

    return this.parseCsv(payload.content);
  }

  private asText(value: unknown): string | undefined {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || undefined;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return undefined;
  }

  private firstText(...values: unknown[]): string | undefined {
    for (const value of values) {
      const text = this.asText(value);
      if (text) {
        return text;
      }
    }
    return undefined;
  }

  private parseNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value
        .trim()
        .replace(/\u00A0/g, "")
        .replace(/\s+/g, "")
        .replace(/[^0-9,.-]/g, "");
      if (!normalized) {
        return fallback;
      }

      const dotNormalized = normalized.includes(",") && !normalized.includes(".")
        ? normalized.replace(/,/g, ".")
        : normalized.replace(/,/g, "");
      const parsed = Number(dotNormalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  private parseInt(value: unknown): number | undefined {
    const parsed = Math.round(this.parseNumber(value, Number.NaN));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private parseImageList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw
        .map((item) => this.asText(item))
        .filter((item): item is string => Boolean(item));
    }

    if (typeof raw === "string") {
      return raw
        .split(/[|;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  private normalizePurpose(value: unknown): ListingPurpose {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (
      normalized.includes("buy") ||
      normalized.includes("sell") ||
      normalized.includes("sale") ||
      normalized.includes("vente")
    ) {
      return "BUY";
    }
    return "RENT";
  }

  private normalizeType(value: unknown): ListingType {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized.includes("villa")) return "VILLA";
    if (normalized.includes("studio")) return "STUDIO";
    if (normalized.includes("land") || normalized.includes("terrain")) return "LAND";
    if (normalized.includes("house") || normalized.includes("maison")) return "HOUSE";
    return "APARTMENT";
  }

  private cityCenter(city: string): { lat: number; lng: number } {
    const normalized = city.toLowerCase().trim();
    return CITY_CENTER[normalized] ?? CITY_CENTER.casablanca;
  }

  private inferSourceConfig(source: ExternalImportSource, row: Record<string, unknown>) {
    if (source === "avito") {
      return {
        sourceName: "avito.ma",
        sourcePlatform: "AVITO" as const
      };
    }
    if (source === "mubawab") {
      return {
        sourceName: "mubawab.ma",
        sourcePlatform: "MUBAWAB" as const
      };
    }

    const platform = this.firstText(row.sourcePlatform, row.platform)?.toLowerCase();
    if (platform?.includes("avito")) {
      return {
        sourceName: this.firstText(row.sourceName, row.marketplace, "avito.ma") ?? "avito.ma",
        sourcePlatform: "AVITO" as const
      };
    }
    if (platform?.includes("mubawab")) {
      return {
        sourceName:
          this.firstText(row.sourceName, row.marketplace, "mubawab.ma") ?? "mubawab.ma",
        sourcePlatform: "MUBAWAB" as const
      };
    }

    return {
      sourceName: this.firstText(row.sourceName, row.marketplace, "external-feed") ?? "external-feed",
      sourcePlatform: "OTHER" as const
    };
  }

  private extractSourceListingId(sourceUrl: string | undefined): string | undefined {
    if (!sourceUrl) {
      return undefined;
    }
    const idMatch = sourceUrl.match(/([0-9]{4,})/);
    return idMatch?.[1];
  }

  private deterministicId(input: string): string {
    return createHash("sha1").update(input).digest("hex").slice(0, 24);
  }

  private clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }

  private fallbackMetrics(row: Record<string, unknown>, listing: ParsedListingRow["listing"]): ZoneMetricsInput {
    const city =
      this.firstText(row.city, row.ville, row.location, listing.title)?.toLowerCase() ??
      "";
    const denseCityBoost = /(casablanca|rabat|tanger|tangier|marrakech)/.test(city)
      ? 8
      : 0;
    const heatBoost = /(marrakech|agadir|ouarzazate|errachidia)/.test(city)
      ? 9
      : 3;
    const priceSignal =
      listing.purpose === "BUY"
        ? (listing.priceSale ?? 0) / 250000
        : (listing.priceMonthly ?? 0) / 1200;
    const areaSignal = ((listing.areaM2 ?? 70) - 70) / 20;
    const bedrooms = listing.bedrooms ?? 2;

    return {
      noiseIndex: this.clamp(50 + denseCityBoost * 0.8),
      greenIndex: this.clamp(52 - denseCityBoost * 0.4),
      airQualityIndex: this.clamp(58 - denseCityBoost * 0.5),
      pollenIndex: this.clamp(40 + denseCityBoost * 0.5),
      floodRiskIndex: this.clamp(33 + denseCityBoost * 0.2),
      heatIndex: this.clamp(45 + heatBoost),
      transitIndex: this.clamp(56 + denseCityBoost * 0.8),
      walkIndex: this.clamp(55 + denseCityBoost * 0.6),
      futureValueIndex: this.clamp(
        52 + denseCityBoost * 0.9 + priceSignal * 9 + areaSignal * 4 + bedrooms * 1.5
      ),
      zoningRiskIndex: this.clamp(35 + denseCityBoost * 0.3)
    };
  }

  private parseMetrics(row: Record<string, unknown>, listing: ParsedListingRow["listing"]) {
    const metricsFromRow = {
      noiseIndex: this.parseNumber(row.noiseIndex, Number.NaN),
      greenIndex: this.parseNumber(row.greenIndex, Number.NaN),
      airQualityIndex: this.parseNumber(row.airQualityIndex, Number.NaN),
      pollenIndex: this.parseNumber(row.pollenIndex, Number.NaN),
      floodRiskIndex: this.parseNumber(row.floodRiskIndex, Number.NaN),
      heatIndex: this.parseNumber(row.heatIndex, Number.NaN),
      transitIndex: this.parseNumber(row.transitIndex, Number.NaN),
      walkIndex: this.parseNumber(row.walkIndex, Number.NaN),
      futureValueIndex: this.parseNumber(row.futureValueIndex, Number.NaN),
      zoningRiskIndex: this.parseNumber(row.zoningRiskIndex, Number.NaN)
    };

    const hasAny = Object.values(metricsFromRow).some((value) => Number.isFinite(value));
    if (!hasAny) {
      return this.fallbackMetrics(row, listing);
    }

    return {
      noiseIndex: this.clamp(metricsFromRow.noiseIndex, 0, 100),
      greenIndex: this.clamp(metricsFromRow.greenIndex, 0, 100),
      airQualityIndex: this.clamp(metricsFromRow.airQualityIndex, 0, 100),
      pollenIndex: this.clamp(metricsFromRow.pollenIndex, 0, 100),
      floodRiskIndex: this.clamp(metricsFromRow.floodRiskIndex, 0, 100),
      heatIndex: this.clamp(metricsFromRow.heatIndex, 0, 100),
      transitIndex: this.clamp(metricsFromRow.transitIndex, 0, 100),
      walkIndex: this.clamp(metricsFromRow.walkIndex, 0, 100),
      futureValueIndex: this.clamp(metricsFromRow.futureValueIndex, 0, 100),
      zoningRiskIndex: this.clamp(metricsFromRow.zoningRiskIndex, 0, 100)
    };
  }

  private parseRow(
    row: Record<string, unknown>,
    source: ExternalImportSource,
    now: Date
  ): ParsedListingRow {
    const zoneName =
      this.firstText(row.name, row.zoneName, row.neighborhood, row.district, row.quartier) ??
      this.firstText(row.title, row.listingTitle);
    const city = this.firstText(row.city, row.ville);
    if (!zoneName || !city) {
      throw new ApiError(400, "Each row requires zone name and city");
    }

    const sourceConfig = this.inferSourceConfig(source, row);
    const title =
      this.firstText(row.title, row.listingTitle, row.name, row.zoneName) ??
      `${zoneName} - ${city}`;

    const sourceUrl = this.firstText(row.sourceUrl, row.url, row.listingUrl);
    const sourceListingId =
      this.firstText(
        row.sourceListingId,
        row.listingId,
        row.id,
        this.extractSourceListingId(sourceUrl)
      ) ??
      this.deterministicId(
        `${sourceConfig.sourcePlatform}:${sourceUrl ?? ""}:${title}:${zoneName}:${city}`
      );

    const purpose = this.normalizePurpose(
      this.firstText(row.listingPurpose, row.purpose, row.operation, row.typeOperation)
    );
    const type = this.normalizeType(
      this.firstText(row.propertyType, row.type, row.property_type, row.category)
    );
    const price = this.parseNumber(row.price, 0);
    const priceMonthly = this.parseNumber(
      row.listingPriceMonthly ?? row.priceMonthly ?? (purpose === "RENT" ? price : undefined),
      0
    );
    const priceSale = this.parseNumber(
      row.listingPriceSale ?? row.priceSale ?? (purpose === "BUY" ? price : undefined),
      0
    );

    const imageUrls = Array.from(
      new Set([
        ...this.parseImageList(row.imageUrls ?? row.images ?? row.photos),
        this.firstText(row.imageUrl, row.coverImage, row.thumbnailUrl) ?? ""
      ])
    ).filter(Boolean);

    const fallbackCenter = this.cityCenter(city);
    const centerLat = this.parseNumber(row.centerLat ?? row.lat ?? row.latitude, fallbackCenter.lat);
    const centerLng = this.parseNumber(row.centerLng ?? row.lng ?? row.longitude, fallbackCenter.lng);

    const listing: ParsedListingRow["listing"] = {
      title,
      description: this.firstText(row.description, row.desc),
      type,
      purpose,
      status: "ACTIVE",
      sourcePlatform: sourceConfig.sourcePlatform,
      sourceName: sourceConfig.sourceName,
      sourceUrl,
      sourceListingId,
      externalReference: row as Prisma.InputJsonValue,
      importedAt: now,
      lastSeenAt: now,
      priceMonthly: purpose === "RENT" && priceMonthly > 0 ? priceMonthly : undefined,
      priceSale: purpose === "BUY" && priceSale > 0 ? priceSale : undefined,
      areaM2: this.parseNumber(row.areaM2 ?? row.area ?? row.surface ?? row.superficie, 0) || undefined,
      bedrooms: this.parseInt(row.bedrooms ?? row.rooms ?? row.chambres),
      bathrooms: this.parseInt(row.bathrooms ?? row.sallesDeBain ?? row.wc),
      imageUrls,
      contactPhone: this.firstText(row.contactPhone, row.phone),
      contactEmail: this.firstText(row.contactEmail, row.email),
      contactWhatsApp: this.firstText(row.contactWhatsApp, row.whatsapp),
      contactInstagram: this.firstText(row.contactInstagram, row.instagram),
      contactFacebook: this.firstText(row.contactFacebook, row.facebook),
      contactWebsite: this.firstText(row.contactWebsite, row.website)
    };

    const metaRaw = row.metaJson;
    let zoneMeta: Record<string, unknown> = {};
    if (typeof metaRaw === "string" && metaRaw.trim()) {
      try {
        zoneMeta = JSON.parse(metaRaw) as Record<string, unknown>;
      } catch {
        zoneMeta = {};
      }
    } else if (metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)) {
      zoneMeta = metaRaw as Record<string, unknown>;
    }

    return {
      zoneName,
      city,
      centerLat,
      centerLng,
      zoneMeta,
      listing,
      metrics: this.parseMetrics(row, listing)
    };
  }

  private async ensureExternalSeller(source: ExternalImportSource) {
    const email =
      source === "avito"
        ? "external-avito@homemall.local"
        : source === "mubawab"
          ? "external-mubawab@homemall.local"
          : "external-feed@homemall.local";

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      return existing;
    }

    const passwordHash = await hashPassword(createHash("sha1").update(email).digest("hex"));
    return this.userRepository.create(email, passwordHash, "USER");
  }

  private async upsertZone(parsed: ParsedListingRow) {
    const existing = await prisma.zone.findFirst({
      where: {
        name: { equals: parsed.zoneName, mode: "insensitive" },
        city: { equals: parsed.city, mode: "insensitive" }
      }
    });

    if (!existing) {
      const created = await prisma.zone.create({
        data: {
          name: parsed.zoneName,
          city: parsed.city,
          centerLat: parsed.centerLat,
          centerLng: parsed.centerLng,
          metaJson: parsed.zoneMeta as Prisma.InputJsonValue
        }
      });
      return { zone: created, created: true };
    }

    const mergedMeta = {
      ...(existing.metaJson && typeof existing.metaJson === "object"
        ? (existing.metaJson as Record<string, unknown>)
        : {}),
      ...parsed.zoneMeta
    };

    const updated = await prisma.zone.update({
      where: { id: existing.id },
      data: {
        centerLat: parsed.centerLat,
        centerLng: parsed.centerLng,
        metaJson: mergedMeta as Prisma.InputJsonValue
      }
    });
    return { zone: updated, created: false };
  }

  async ingest(payload: ExternalIngestionPayload): Promise<ExternalIngestionResult> {
    const rows = this.parseRows(payload);
    const now = new Date();
    const seller = await this.ensureExternalSeller(payload.source);
    const seenSourceListingIds: string[] = [];

    let createdZones = 0;
    let updatedZones = 0;
    let createdListings = 0;
    let updatedListings = 0;
    let metricsUpdated = 0;
    let staleListingsPaused = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const parsed = this.parseRow(row, payload.source, now);
        const { zone, created } = await this.upsertZone(parsed);
        if (created) {
          createdZones += 1;
        } else {
          updatedZones += 1;
        }

        await prisma.zoneMetrics.upsert({
          where: { zoneId: zone.id },
          create: {
            zoneId: zone.id,
            ...parsed.metrics
          },
          update: parsed.metrics
        });
        metricsUpdated += 1;

        const existingListing = await this.listingRepository.findBySourceListing(
          parsed.listing.sourcePlatform,
          parsed.listing.sourceListingId
        );

        await this.listingRepository.upsertExternal({
          sellerId: seller.id,
          zoneId: zone.id,
          ...parsed.listing
        });

        if (existingListing) {
          updatedListings += 1;
        } else {
          createdListings += 1;
        }
        seenSourceListingIds.push(parsed.listing.sourceListingId);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const sourcePlatform =
      payload.source === "avito"
        ? "AVITO"
        : payload.source === "mubawab"
          ? "MUBAWAB"
          : ("OTHER" as const);

    if (payload.deactivateMissing && seenSourceListingIds.length > 0) {
      const result = await this.listingRepository.markExternalListingsStale({
        sourcePlatform,
        seenSourceListingIds,
        staleStatus: "PAUSED"
      });
      staleListingsPaused = result.count;
    }

    return {
      parsed: rows.length,
      source: payload.source,
      createdZones,
      updatedZones,
      createdListings,
      updatedListings,
      metricsUpdated,
      staleListingsPaused,
      errors
    };
  }
}
