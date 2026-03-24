import type { ListingPurpose, ListingSourcePlatform, ListingStatus, ListingType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const listingInclude = {
  seller: {
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      isActive: true
    }
  },
  zone: {
    select: {
      id: true,
      name: true,
      city: true,
      centerLat: true,
      centerLng: true
    }
  }
} as const;

export type ListingWithRelations = Prisma.UserListingGetPayload<{
  include: typeof listingInclude;
}>;

export class ListingRepository {
  async create(input: {
    sellerId: string;
    zoneId: string;
    title: string;
    description?: string;
    type: ListingType;
    purpose: ListingPurpose;
    status: ListingStatus;
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
    sourcePlatform?: ListingSourcePlatform;
    sourceName?: string;
    sourceUrl?: string;
    sourceListingId?: string;
    externalReference?: Prisma.InputJsonValue;
    importedAt?: Date;
    lastSeenAt?: Date;
    isExternal?: boolean;
  }): Promise<ListingWithRelations> {
    return prisma.userListing.create({
      data: {
        sellerId: input.sellerId,
        zoneId: input.zoneId,
        title: input.title,
        description: input.description,
        type: input.type,
        purpose: input.purpose,
        status: input.status,
        priceMonthly: input.priceMonthly,
        priceSale: input.priceSale,
        areaM2: input.areaM2,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        imageUrls: input.imageUrls,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactWhatsApp: input.contactWhatsApp,
        contactInstagram: input.contactInstagram,
        contactFacebook: input.contactFacebook,
        contactWebsite: input.contactWebsite,
        sourcePlatform: input.sourcePlatform,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        sourceListingId: input.sourceListingId,
        externalReference: input.externalReference,
        importedAt: input.importedAt,
        lastSeenAt: input.lastSeenAt,
        isExternal: input.isExternal
      },
      include: listingInclude
    });
  }

  async upsertExternal(input: {
    sellerId: string;
    zoneId: string;
    title: string;
    description?: string;
    type: ListingType;
    purpose: ListingPurpose;
    status: ListingStatus;
    sourcePlatform: ListingSourcePlatform;
    sourceName?: string;
    sourceUrl?: string;
    sourceListingId: string;
    externalReference?: Prisma.InputJsonValue;
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
  }): Promise<ListingWithRelations> {
    return prisma.userListing.upsert({
      where: {
        sourcePlatform_sourceListingId: {
          sourcePlatform: input.sourcePlatform,
          sourceListingId: input.sourceListingId
        }
      },
      create: {
        sellerId: input.sellerId,
        zoneId: input.zoneId,
        title: input.title,
        description: input.description,
        type: input.type,
        purpose: input.purpose,
        status: input.status,
        sourcePlatform: input.sourcePlatform,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        sourceListingId: input.sourceListingId,
        externalReference: input.externalReference,
        importedAt: input.importedAt,
        lastSeenAt: input.lastSeenAt,
        isExternal: true,
        priceMonthly: input.priceMonthly,
        priceSale: input.priceSale,
        areaM2: input.areaM2,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        imageUrls: input.imageUrls,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactWhatsApp: input.contactWhatsApp,
        contactInstagram: input.contactInstagram,
        contactFacebook: input.contactFacebook,
        contactWebsite: input.contactWebsite
      },
      update: {
        sellerId: input.sellerId,
        zoneId: input.zoneId,
        title: input.title,
        description: input.description,
        type: input.type,
        purpose: input.purpose,
        status: input.status,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        externalReference: input.externalReference,
        importedAt: input.importedAt,
        lastSeenAt: input.lastSeenAt,
        isExternal: true,
        priceMonthly: input.priceMonthly,
        priceSale: input.priceSale,
        areaM2: input.areaM2,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        imageUrls: input.imageUrls,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactWhatsApp: input.contactWhatsApp,
        contactInstagram: input.contactInstagram,
        contactFacebook: input.contactFacebook,
        contactWebsite: input.contactWebsite
      },
      include: listingInclude
    });
  }

  async findById(id: string): Promise<ListingWithRelations | null> {
    return prisma.userListing.findUnique({
      where: { id },
      include: listingInclude
    });
  }

  async findBySourceListing(
    sourcePlatform: ListingSourcePlatform,
    sourceListingId: string
  ): Promise<ListingWithRelations | null> {
    return prisma.userListing.findUnique({
      where: {
        sourcePlatform_sourceListingId: {
          sourcePlatform,
          sourceListingId
        }
      },
      include: listingInclude
    });
  }

  async listPublic(params: {
    zoneId?: string;
    purpose?: ListingPurpose;
    limit: number;
  }): Promise<ListingWithRelations[]> {
    return prisma.userListing.findMany({
      where: {
        status: "ACTIVE",
        zoneId: params.zoneId,
        purpose: params.purpose
      },
      orderBy: [{ createdAt: "desc" }],
      take: params.limit,
      include: listingInclude
    });
  }

  async listPublicBySeller(params: {
    sellerId: string;
    limit: number;
  }): Promise<ListingWithRelations[]> {
    return prisma.userListing.findMany({
      where: {
        sellerId: params.sellerId,
        status: "ACTIVE"
      },
      orderBy: [{ createdAt: "desc" }],
      take: params.limit,
      include: listingInclude
    });
  }

  async listMine(params: { sellerId: string; limit: number }): Promise<ListingWithRelations[]> {
    return prisma.userListing.findMany({
      where: {
        sellerId: params.sellerId
      },
      orderBy: [{ updatedAt: "desc" }],
      take: params.limit,
      include: listingInclude
    });
  }

  async updateBySeller(params: {
    id: string;
    sellerId: string;
    patch: Partial<{
      title: string;
      description: string | null;
      type: ListingType;
      purpose: ListingPurpose;
      status: ListingStatus;
      priceMonthly: number | null;
      priceSale: number | null;
      areaM2: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      imageUrls: string[];
      contactPhone: string | null;
      contactEmail: string | null;
      contactWhatsApp: string | null;
      contactInstagram: string | null;
      contactFacebook: string | null;
      contactWebsite: string | null;
    }>;
  }): Promise<ListingWithRelations | null> {
    const updated = await prisma.userListing.updateMany({
      where: {
        id: params.id,
        sellerId: params.sellerId
      },
      data: params.patch
    });

    if (updated.count === 0) {
      return null;
    }

    return this.findById(params.id);
  }

  async deleteBySeller(params: { id: string; sellerId: string }): Promise<boolean> {
    const result = await prisma.userListing.deleteMany({
      where: {
        id: params.id,
        sellerId: params.sellerId
      }
    });
    return result.count > 0;
  }

  async upsertReport(params: {
    listingId: string;
    reporterId: string;
    reason: string;
  }) {
    return prisma.listingReport.upsert({
      where: {
        listingId_reporterId: {
          listingId: params.listingId,
          reporterId: params.reporterId
        }
      },
      create: {
        listingId: params.listingId,
        reporterId: params.reporterId,
        reason: params.reason
      },
      update: {
        reason: params.reason
      }
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await prisma.userListing.deleteMany({
      where: { id }
    });
    return result.count > 0;
  }

  async updateStatusById(id: string, status: ListingStatus): Promise<ListingWithRelations | null> {
    const result = await prisma.userListing.updateMany({
      where: { id },
      data: { status }
    });
    if (!result.count) {
      return null;
    }
    return this.findById(id);
  }

  async listForAdmin(params: {
    search?: string;
    status?: ListingStatus;
    purpose?: ListingPurpose;
    sourcePlatform?: ListingSourcePlatform;
    isExternal?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: ListingWithRelations[]; total: number }> {
    const where: Prisma.UserListingWhereInput = {
      status: params.status,
      purpose: params.purpose,
      sourcePlatform: params.sourcePlatform,
      isExternal: params.isExternal
    };

    if (params.search?.trim()) {
      where.OR = [
        { title: { contains: params.search.trim(), mode: "insensitive" } },
        { description: { contains: params.search.trim(), mode: "insensitive" } },
        { sourceName: { contains: params.search.trim(), mode: "insensitive" } },
        { zone: { name: { contains: params.search.trim(), mode: "insensitive" } } },
        { zone: { city: { contains: params.search.trim(), mode: "insensitive" } } },
        { seller: { email: { contains: params.search.trim(), mode: "insensitive" } } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.userListing.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: params.skip,
        take: params.take,
        include: listingInclude
      }),
      prisma.userListing.count({ where })
    ]);

    return { items, total };
  }

  async aggregateActiveInventory(zoneIds: string[]): Promise<
    Array<{
      zoneId: string;
      purpose: ListingPurpose;
      type: ListingType;
      _count: { _all: number };
    }>
  > {
    if (zoneIds.length === 0) {
      return [];
    }

    const rows = await (prisma.userListing as any).groupBy({
      by: ["zoneId", "purpose", "type"],
      where: {
        zoneId: { in: zoneIds },
        status: "ACTIVE"
      },
      _count: {
        _all: true
      }
    });

    return rows as Array<{
      zoneId: string;
      purpose: ListingPurpose;
      type: ListingType;
      _count: { _all: number };
    }>;
  }

  async listTopActiveByZoneIds(zoneIds: string[]) {
    if (zoneIds.length === 0) {
      return [];
    }

    return prisma.userListing.findMany({
      where: {
        zoneId: { in: zoneIds },
        status: "ACTIVE"
      },
      orderBy: [{ updatedAt: "desc" }],
      include: listingInclude
    });
  }

  async markExternalListingsStale(params: {
    sourcePlatform: ListingSourcePlatform;
    seenSourceListingIds: string[];
    staleStatus: ListingStatus;
  }) {
    const where: Prisma.UserListingWhereInput = {
      sourcePlatform: params.sourcePlatform,
      isExternal: true
    };

    if (params.seenSourceListingIds.length > 0) {
      where.sourceListingId = {
        notIn: params.seenSourceListingIds
      };
    }

    return prisma.userListing.updateMany({
      where,
      data: {
        status: params.staleStatus
      }
    });
  }
}
