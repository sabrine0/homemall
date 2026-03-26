import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class ZoneRepository {
  async existsById(id: string): Promise<boolean> {
    const zone = await prisma.zone.findUnique({
      where: { id },
      select: { id: true }
    });
    return Boolean(zone);
  }

  async listWithMetrics() {
    return prisma.zone.findMany({
      include: {
        metrics: true
      },
      orderBy: {
        name: "asc"
      }
    });
  }

  async findByIdWithMetrics(id: string) {
    return prisma.zone.findUnique({
      where: { id },
      include: {
        metrics: true
      }
    });
  }

  async findByNameCity(name: string, city: string) {
    return prisma.zone.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        city: { equals: city, mode: "insensitive" }
      },
      include: {
        metrics: true
      }
    });
  }

  async create(input: {
    name: string;
    city: string;
    centerLat: number;
    centerLng: number;
    metaJson: Record<string, unknown>;
    metrics?: {
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
  }) {
    return prisma.zone.create({
      data: {
        name: input.name,
        city: input.city,
        centerLat: input.centerLat,
        centerLng: input.centerLng,
        metaJson: input.metaJson as Prisma.InputJsonValue,
        metrics: input.metrics
          ? {
              create: input.metrics
            }
          : undefined
      },
      include: {
        metrics: true
      }
    });
  }
}
