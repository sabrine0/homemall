import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class AnalysisRepository {
  async create(userId: string, zoneId: string, scoreJson: unknown, tclJson: unknown) {
    return prisma.analysisResult.create({
      data: {
        userId,
        zoneId,
        scoreJson: scoreJson as Prisma.InputJsonValue,
        tclJson: tclJson as Prisma.InputJsonValue
      }
    });
  }

  async latestByUser(userId: string) {
    return prisma.analysisResult.findMany({
      where: { userId },
      include: {
        zone: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
  }
}
