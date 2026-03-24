import type {
  CreateListingInputDto,
  ListingsQueryDto,
  ListingOffer,
  ListingOfferReport,
  ListingPropertyType,
  ListingPurpose,
  ListingSourcePlatform as SharedListingSourcePlatform,
  ListingStatus,
  ReportListingInputDto,
  UpdateListingInputDto
} from "@homemall/shared";
import type {
  ListingPurpose as PrismaListingPurpose,
  ListingSourcePlatform as PrismaListingSourcePlatform,
  ListingStatus as PrismaListingStatus,
  ListingType as PrismaListingType
} from "@prisma/client";
import { ApiError } from "../middlewares/error.middleware.js";
import { ListingRepository, type ListingWithRelations } from "../repositories/listing.repository.js";
import { ZoneRepository } from "../repositories/zone.repository.js";
import { deriveSellerCompanyName, deriveSellerDisplayName } from "./seller-public.utils.js";

const toPrismaType = (value: ListingPropertyType): PrismaListingType => {
  if (value === "house") return "HOUSE";
  if (value === "studio") return "STUDIO";
  if (value === "villa") return "VILLA";
  if (value === "land") return "LAND";
  return "APARTMENT";
};

const fromPrismaType = (value: PrismaListingType): ListingPropertyType => {
  if (value === "HOUSE") return "house";
  if (value === "STUDIO") return "studio";
  if (value === "VILLA") return "villa";
  if (value === "LAND") return "land";
  return "apartment";
};

const toPrismaPurpose = (value: ListingPurpose): PrismaListingPurpose => (value === "buy" ? "BUY" : "RENT");

const fromPrismaPurpose = (value: PrismaListingPurpose): ListingPurpose => (value === "BUY" ? "buy" : "rent");

const toPrismaStatus = (value: ListingStatus): PrismaListingStatus => {
  if (value === "paused") return "PAUSED";
  if (value === "closed") return "CLOSED";
  return "ACTIVE";
};

const fromPrismaStatus = (value: PrismaListingStatus): ListingStatus => {
  if (value === "PAUSED") return "paused";
  if (value === "CLOSED") return "closed";
  return "active";
};

const toPrismaSourcePlatform = (
  value: SharedListingSourcePlatform
): PrismaListingSourcePlatform => {
  if (value === "avito") return "AVITO";
  if (value === "mubawab") return "MUBAWAB";
  if (value === "other") return "OTHER";
  return "MANUAL";
};

const fromPrismaSourcePlatform = (
  value: PrismaListingSourcePlatform
): SharedListingSourcePlatform => {
  if (value === "AVITO") return "avito";
  if (value === "MUBAWAB") return "mubawab";
  if (value === "OTHER") return "other";
  return "manual";
};

const safeImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter((item) => item.length > 0);
};

const cleanOptionalText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export class ListingService {
  private readonly listingRepository = new ListingRepository();
  private readonly zoneRepository = new ZoneRepository();

  private toListingOffer(listing: ListingWithRelations): ListingOffer {
    const imageUrls = safeImageUrls(listing.imageUrls);
    const sellerDisplayName = listing.seller
      ? cleanOptionalText(listing.seller.displayName ?? undefined) ??
        deriveSellerDisplayName(listing.seller.email)
      : undefined;
    const sellerCompanyName = listing.seller
      ? deriveSellerCompanyName(listing.seller.email, listing.zone?.city)
      : undefined;

    return {
      id: listing.id,
      zoneId: listing.zoneId,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description ?? undefined,
      type: fromPrismaType(listing.type),
      purpose: fromPrismaPurpose(listing.purpose),
      sourcePlatform: fromPrismaSourcePlatform(listing.sourcePlatform),
      sourceListingId: listing.sourceListingId ?? undefined,
      sourceUrl: listing.sourceUrl ?? undefined,
      priceMonthly: listing.priceMonthly ?? undefined,
      priceSale: listing.priceSale ?? undefined,
      areaM2: listing.areaM2 ?? undefined,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      imageUrl: imageUrls[0],
      imageUrls,
      contactPhone: listing.contactPhone ?? undefined,
      contactEmail: listing.contactEmail ?? undefined,
      contactWhatsApp: listing.contactWhatsApp ?? undefined,
      contactInstagram: listing.contactInstagram ?? undefined,
      contactFacebook: listing.contactFacebook ?? undefined,
      contactWebsite: listing.contactWebsite ?? undefined,
      status: fromPrismaStatus(listing.status),
      seller: listing.seller
        ? {
            id: listing.seller.id,
            email: listing.seller.email,
            displayName: sellerDisplayName,
            companyName: sellerCompanyName,
            avatarUrl: listing.seller.avatarUrl ?? undefined
          }
        : undefined,
      zoneName: listing.zone?.name ?? undefined,
      zoneCity: listing.zone?.city ?? undefined,
      zoneCenterLat: listing.zone?.centerLat ?? undefined,
      zoneCenterLng: listing.zone?.centerLng ?? undefined,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString()
    };
  }

  async create(sellerId: string, input: CreateListingInputDto): Promise<ListingOffer> {
    const zoneExists = await this.zoneRepository.existsById(input.zoneId);
    if (!zoneExists) {
      throw new ApiError(404, "Zone not found");
    }

    const listing = await this.listingRepository.create({
      sellerId,
      zoneId: input.zoneId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      type: toPrismaType(input.type),
      purpose: toPrismaPurpose(input.purpose),
      status: "ACTIVE",
      priceMonthly: input.priceMonthly,
      priceSale: input.priceSale,
      areaM2: input.areaM2,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      imageUrls: input.imageUrls,
      contactPhone: cleanOptionalText(input.contactPhone),
      contactEmail: cleanOptionalText(input.contactEmail),
      contactWhatsApp: cleanOptionalText(input.contactWhatsApp),
      contactInstagram: cleanOptionalText(input.contactInstagram),
      contactFacebook: cleanOptionalText(input.contactFacebook),
      contactWebsite: cleanOptionalText(input.contactWebsite)
    });

    return this.toListingOffer(listing);
  }

  async listPublic(query: ListingsQueryDto): Promise<ListingOffer[]> {
    const listings = await this.listingRepository.listPublic({
      zoneId: query.zoneId,
      purpose: query.purpose ? toPrismaPurpose(query.purpose) : undefined,
      limit: query.limit ?? 50
    });

    return listings.map((item) => this.toListingOffer(item));
  }

  private parsePaging(input: { page?: string; limit?: string }) {
    const page = Math.max(1, Number(input.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(input.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async listForAdmin(input: {
    page?: string;
    limit?: string;
    search?: string;
    status?: ListingStatus;
    purpose?: ListingPurpose;
    sourcePlatform?: SharedListingSourcePlatform;
    isExternal?: "true" | "false";
  }) {
    const paging = this.parsePaging(input);
    const { items, total } = await this.listingRepository.listForAdmin({
      skip: paging.skip,
      take: paging.limit,
      search: input.search,
      status: input.status ? toPrismaStatus(input.status) : undefined,
      purpose: input.purpose ? toPrismaPurpose(input.purpose) : undefined,
      sourcePlatform: input.sourcePlatform
        ? toPrismaSourcePlatform(input.sourcePlatform)
        : undefined,
      isExternal:
        input.isExternal === "true"
          ? true
          : input.isExternal === "false"
            ? false
            : undefined
    });

    return {
      items: items.map((item) => this.toListingOffer(item)),
      total,
      page: paging.page,
      limit: paging.limit,
      pages: Math.max(1, Math.ceil(total / paging.limit))
    };
  }

  async updateListingStatusByAdmin(
    listingId: string,
    status: ListingStatus
  ): Promise<ListingOffer> {
    const updated = await this.listingRepository.updateStatusById(
      listingId,
      toPrismaStatus(status)
    );
    if (!updated) {
      throw new ApiError(404, "Listing not found");
    }
    return this.toListingOffer(updated);
  }

  async deleteListingByAdmin(listingId: string): Promise<void> {
    const deleted = await this.listingRepository.deleteById(listingId);
    if (!deleted) {
      throw new ApiError(404, "Listing not found");
    }
  }

  async listMine(userId: string, limit = 100): Promise<ListingOffer[]> {
    const listings = await this.listingRepository.listMine({
      sellerId: userId,
      limit
    });
    return listings.map((item) => this.toListingOffer(item));
  }

  async listPublicBySeller(sellerId: string, limit = 60): Promise<ListingOffer[]> {
    const listings = await this.listingRepository.listPublicBySeller({
      sellerId,
      limit
    });
    return listings.map((item) => this.toListingOffer(item));
  }

  async getById(listingId: string): Promise<ListingOffer> {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }
    return this.toListingOffer(listing);
  }

  async getRawById(listingId: string): Promise<ListingWithRelations> {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }
    return listing;
  }

  async updateMine(userId: string, listingId: string, patch: UpdateListingInputDto): Promise<ListingOffer> {
    const updated = await this.listingRepository.updateBySeller({
      id: listingId,
      sellerId: userId,
      patch: {
        title: patch.title?.trim(),
        description: patch.description === undefined ? undefined : patch.description.trim() || null,
        type: patch.type ? toPrismaType(patch.type) : undefined,
        purpose: patch.purpose ? toPrismaPurpose(patch.purpose) : undefined,
        status: patch.status ? toPrismaStatus(patch.status) : undefined,
        priceMonthly: patch.priceMonthly === undefined ? undefined : patch.priceMonthly,
        priceSale: patch.priceSale === undefined ? undefined : patch.priceSale,
        areaM2: patch.areaM2 === undefined ? undefined : patch.areaM2,
        bedrooms: patch.bedrooms === undefined ? undefined : patch.bedrooms,
        bathrooms: patch.bathrooms === undefined ? undefined : patch.bathrooms,
        imageUrls: patch.imageUrls,
        contactPhone: patch.contactPhone === undefined ? undefined : cleanOptionalText(patch.contactPhone) ?? null,
        contactEmail: patch.contactEmail === undefined ? undefined : cleanOptionalText(patch.contactEmail) ?? null,
        contactWhatsApp: patch.contactWhatsApp === undefined ? undefined : cleanOptionalText(patch.contactWhatsApp) ?? null,
        contactInstagram: patch.contactInstagram === undefined ? undefined : cleanOptionalText(patch.contactInstagram) ?? null,
        contactFacebook: patch.contactFacebook === undefined ? undefined : cleanOptionalText(patch.contactFacebook) ?? null,
        contactWebsite: patch.contactWebsite === undefined ? undefined : cleanOptionalText(patch.contactWebsite) ?? null
      }
    });

    if (!updated) {
      throw new ApiError(404, "Listing not found or not owned by current user");
    }

    return this.toListingOffer(updated);
  }

  async reportListing(
    reporterId: string,
    listingId: string,
    input: ReportListingInputDto
  ): Promise<ListingOfferReport> {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) {
      throw new ApiError(404, "Listing not found");
    }

    if (listing.sellerId === reporterId) {
      throw new ApiError(400, "You cannot report your own listing");
    }

    const report = await this.listingRepository.upsertReport({
      listingId,
      reporterId,
      reason: input.reason.trim()
    });

    return {
      id: report.id,
      listingId: report.listingId,
      reporterId: report.reporterId,
      reason: report.reason,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString()
    };
  }

  async deleteMine(userId: string, listingId: string): Promise<void> {
    const deleted = await this.listingRepository.deleteBySeller({
      id: listingId,
      sellerId: userId
    });
    if (!deleted) {
      throw new ApiError(404, "Listing not found or not owned by current user");
    }
  }
}
