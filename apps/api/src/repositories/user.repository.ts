import { prisma } from "../config/prisma.js";
import type { AdminPermission, UserRole } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, passwordHash: string, role: UserRole = "USER") {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        role
      }
    });
  }

  async updateAccess(
    userId: string,
    patch: {
      role?: UserRole;
      isActive?: boolean;
      adminPermissions?: AdminPermission[];
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        role: patch.role,
        isActive: patch.isActive,
        adminPermissions: patch.adminPermissions
      }
    });
  }

  async updatePublicProfile(
    userId: string,
    patch: {
      displayName?: string | null;
      avatarUrl?: string | null;
      contactPhone?: string | null;
      contactWhatsApp?: string | null;
      contactInstagram?: string | null;
      contactFacebook?: string | null;
      contactWebsite?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: patch
    });
  }

  async setPasswordResetChallenge(
    userId: string,
    challenge: { codeHash: string; expiresAt: Date }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetCodeHash: challenge.codeHash,
        passwordResetExpiresAt: challenge.expiresAt
      }
    });
  }

  async clearPasswordResetChallenge(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null
      }
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash
      }
    });
  }

  async list(params: { search?: string; skip: number; take: number }) {
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
}
