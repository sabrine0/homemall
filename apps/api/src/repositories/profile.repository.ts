import type { UserProfileInput } from "@homemall/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class ProfileRepository {
  async upsertByUserId(userId: string, payload: UserProfileInput) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: {
        goal: payload.goal,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        workLat: payload.workLat,
        workLng: payload.workLng,
        mobilityModes: payload.mobilityModes as Prisma.InputJsonValue,
        sensitivities: payload.sensitivities as unknown as Prisma.InputJsonValue
      },
      create: {
        userId,
        goal: payload.goal,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        workLat: payload.workLat,
        workLng: payload.workLng,
        mobilityModes: payload.mobilityModes as Prisma.InputJsonValue,
        sensitivities: payload.sensitivities as unknown as Prisma.InputJsonValue
      }
    });
  }

  async findByUserId(userId: string) {
    return prisma.userProfile.findUnique({ where: { userId } });
  }
}
