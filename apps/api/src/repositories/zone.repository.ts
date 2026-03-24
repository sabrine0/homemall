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
}
