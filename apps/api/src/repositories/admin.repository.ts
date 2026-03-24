import type {
  AdminPermission,
  Prisma,
  UserRole
} from "@prisma/client";
import { prisma } from "../config/prisma.js";

interface PaginationParams {
  search?: string;
  skip: number;
  take: number;
}

interface AdminReportUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AdminReportZone {
  id: string;
  name: string;
  city: string;
}

interface AdminReportListing {
  id: string;
  title: string;
  seller: {
    id: string;
    email: string;
  };
}

export interface AdminReportRow {
  id: string;
  kind: "analysis" | "listing_report";
  createdAt: Date;
  user: AdminReportUser;
  zone: AdminReportZone;
  listing?: AdminReportListing;
  reason?: string;
}

export class AdminRepository {
  async listZones(params: PaginationParams) {
    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { city: { contains: params.search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.zone.findMany({
        where,
        include: { metrics: true },
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take
      }),
      prisma.zone.count({ where })
    ]);

    return { items, total };
  }

  async createZone(input: {
    name: string;
    city: string;
    centerLat: number;
    centerLng: number;
    metaJson: Record<string, unknown>;
  }) {
    return prisma.zone.create({
      data: {
        name: input.name,
        city: input.city,
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        metaJson: input.metaJson as Prisma.InputJsonValue
      }
    });
  }

  async getZone(id: string) {
    return prisma.zone.findUnique({
      where: { id },
      include: { metrics: true }
    });
  }

  async updateZone(
    id: string,
    input: {
      name: string;
      city: string;
      centerLat: number;
      centerLng: number;
      metaJson: Record<string, unknown>;
    }
  ) {
    return prisma.zone.update({
      where: { id },
      data: {
        name: input.name,
        city: input.city,
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        metaJson: input.metaJson as Prisma.InputJsonValue
      }
    });
  }

  async deleteZone(id: string) {
    return prisma.zone.delete({
      where: { id }
    });
  }

  async getZoneMetrics(zoneId: string) {
    return prisma.zoneMetrics.findUnique({
      where: { zoneId }
    });
  }

  async upsertZoneMetrics(
    zoneId: string,
    input: {
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
    }
  ) {
    return prisma.zoneMetrics.upsert({
      where: { zoneId },
      create: {
        zoneId,
        ...input
      },
      update: input
    });
  }

  async findZoneByNameCity(name: string, city: string) {
    return prisma.zone.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        city: { equals: city, mode: "insensitive" }
      }
    });
  }

  async listUsers(params: PaginationParams) {
    const where = params.search
      ? {
          OR: [{ email: { contains: params.search, mode: "insensitive" as const } }]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          adminPermissions: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return { items, total };
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async createAdminUser(input: {
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    adminPermissions: AdminPermission[];
  }) {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        isActive: input.isActive,
        adminPermissions: input.adminPermissions
      }
    });
  }

  async updateUserAccess(
    userId: string,
    patch: {
      role?: UserRole;
      isActive?: boolean;
      adminPermissions?: AdminPermission[];
      displayName?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        role: patch.role,
        isActive: patch.isActive,
        adminPermissions: patch.adminPermissions,
        displayName: patch.displayName
      }
    });
  }

  async listAdminUsers(params: PaginationParams) {
    const where: Prisma.UserWhereInput = {
      role: {
        in: ["SUPER_ADMIN", "MANAGER"]
      }
    };

    if (params.search?.trim()) {
      where.email = {
        contains: params.search.trim(),
        mode: "insensitive"
      };
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          adminPermissions: true,
          displayName: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return { items, total };
  }

  async listReports(params: { skip: number; take: number }) {
    const fetchSize = params.skip + params.take;
    const [analysisRows, listingReportRows, analysisTotal, listingTotal] = await Promise.all([
      prisma.analysisResult.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true }
          },
          zone: {
            select: { id: true, name: true, city: true }
          }
        },
        take: fetchSize
      }),
      prisma.listingReport.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: { id: true, email: true, role: true, isActive: true }
          },
          listing: {
            select: {
              id: true,
              title: true,
              seller: {
                select: {
                  id: true,
                  email: true
                }
              },
              zone: {
                select: {
                  id: true,
                  name: true,
                  city: true
                }
              }
            }
          }
        },
        take: fetchSize
      }),
      prisma.analysisResult.count(),
      prisma.listingReport.count()
    ]);

    const combined: AdminReportRow[] = [
      ...analysisRows.map((item) => ({
        id: item.id,
        kind: "analysis" as const,
        createdAt: item.createdAt,
        user: item.user,
        zone: item.zone
      })),
      ...listingReportRows.map((item) => ({
        id: item.id,
        kind: "listing_report" as const,
        createdAt: item.createdAt,
        user: item.reporter,
        zone: item.listing.zone,
        listing: {
          id: item.listing.id,
          title: item.listing.title,
          seller: item.listing.seller
        },
        reason: item.reason
      }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const items = combined.slice(params.skip, params.skip + params.take);
    const total = analysisTotal + listingTotal;

    return { items, total };
  }

  async exportReportsJson() {
    const [analysisRows, listingReportRows] = await Promise.all([
      prisma.analysisResult.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true }
          },
          zone: {
            select: { id: true, name: true, city: true }
          }
        }
      }),
      prisma.listingReport.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: { id: true, email: true, role: true, isActive: true }
          },
          listing: {
            select: {
              id: true,
              title: true,
              seller: {
                select: {
                  id: true,
                  email: true
                }
              },
              zone: {
                select: {
                  id: true,
                  name: true,
                  city: true
                }
              }
            }
          }
        }
      })
    ]);

    const rows: AdminReportRow[] = [
      ...analysisRows.map((item) => ({
        id: item.id,
        kind: "analysis" as const,
        createdAt: item.createdAt,
        user: item.user,
        zone: item.zone
      })),
      ...listingReportRows.map((item) => ({
        id: item.id,
        kind: "listing_report" as const,
        createdAt: item.createdAt,
        user: item.reporter,
        zone: item.listing.zone,
        listing: {
          id: item.listing.id,
          title: item.listing.title,
          seller: item.listing.seller
        },
        reason: item.reason
      }))
    ];

    return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listSystemSettings() {
    return prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
      include: {
        updatedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  async upsertSystemSetting(input: {
    key: string;
    valueJson: Record<string, unknown>;
    description?: string;
    updatedById: string;
  }) {
    return prisma.systemSetting.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        valueJson: input.valueJson as Prisma.InputJsonValue,
        description: input.description,
        updatedById: input.updatedById
      },
      update: {
        valueJson: input.valueJson as Prisma.InputJsonValue,
        description: input.description,
        updatedById: input.updatedById
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  async dashboardStats() {
    const [zonesCount, usersCount, analysesCount, listingsCount, reportsCount, adminsCount] =
      await Promise.all([
        prisma.zone.count(),
        prisma.user.count(),
        prisma.analysisResult.count(),
        prisma.userListing.count(),
        prisma.listingReport.count(),
        prisma.user.count({
          where: {
            role: { in: ["SUPER_ADMIN", "MANAGER"] }
          }
        })
      ]);

    return {
      zonesCount,
      usersCount,
      analysesCount,
      listingsCount,
      reportsCount,
      adminsCount
    };
  }
}
