import type { UpdateAccountInputDto } from "@homemall/shared";
import { createHash, randomInt } from "node:crypto";
import { ApiError } from "../middlewares/error.middleware.js";
import { env } from "../config/env.js";
import { UserRepository } from "../repositories/user.repository.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/jwt.js";
import type { AdminPermission, UserRole } from "@prisma/client";

const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS",
  "MANAGE_IMPORTS",
  "MANAGE_SETTINGS",
  "MANAGE_ADMINS"
];
const DEFAULT_MANAGER_PERMISSIONS: AdminPermission[] = [
  "MANAGE_USERS",
  "MANAGE_LISTINGS",
  "MODERATE_REPORTS"
];

export class AuthService {
  private userRepository = new UserRepository();
  private readonly passwordResetExpiresInMinutes = 15;

  private resolveAdminPermissions(role: UserRole, assigned: AdminPermission[]) {
    if (role === "SUPER_ADMIN") {
      return ALL_ADMIN_PERMISSIONS;
    }
    if (role === "MANAGER") {
      return Array.from(new Set([...DEFAULT_MANAGER_PERMISSIONS, ...assigned]));
    }
    return [];
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    displayName: string | null;
    avatarUrl: string | null;
    contactPhone: string | null;
    contactWhatsApp: string | null;
    contactInstagram: string | null;
    contactFacebook: string | null;
    contactWebsite: string | null;
    isActive: boolean;
    adminPermissions: AdminPermission[];
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      adminPermissions: this.resolveAdminPermissions(user.role, user.adminPermissions),
      createdAt: user.createdAt.toISOString(),
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      contactPhone: user.contactPhone ?? undefined,
      contactWhatsApp: user.contactWhatsApp ?? undefined,
      contactInstagram: user.contactInstagram ?? undefined,
      contactFacebook: user.contactFacebook ?? undefined,
      contactWebsite: user.contactWebsite ?? undefined
    };
  }

  async signup(email: string, password: string, role: UserRole = "USER") {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }

    const passwordHash = await hashPassword(password);
    const user = await this.userRepository.create(email, passwordHash, role);
    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });

    return {
      user: this.toPublicUser(user),
      token
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, "Invalid credentials");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Your account has been disabled");
    }

    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });

    return {
      user: this.toPublicUser(user),
      token
    };
  }

  async me(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return this.toPublicUser(user);
  }

  async updateMe(userId: string, input: UpdateAccountInputDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const updated = await this.userRepository.updatePublicProfile(userId, {
      displayName:
        input.displayName === undefined ? undefined : input.displayName.trim() || null,
      avatarUrl:
        input.avatarUrl === undefined ? undefined : input.avatarUrl.trim() || null,
      contactPhone:
        input.contactPhone === undefined ? undefined : input.contactPhone.trim() || null,
      contactWhatsApp:
        input.contactWhatsApp === undefined ? undefined : input.contactWhatsApp.trim() || null,
      contactInstagram:
        input.contactInstagram === undefined ? undefined : input.contactInstagram.trim() || null,
      contactFacebook:
        input.contactFacebook === undefined ? undefined : input.contactFacebook.trim() || null,
      contactWebsite:
        input.contactWebsite === undefined ? undefined : input.contactWebsite.trim() || null
    });

    return this.toPublicUser(updated);
  }

  private hashResetCode(userId: string, code: string) {
    return createHash("sha256")
      .update(`${userId}:${code}:${env.JWT_SECRET}`)
      .digest("hex");
  }

  private createResetCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  private async getUserForReset(email: string) {
    const user = await this.userRepository.findByEmail(email.trim());
    if (!user) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      await this.userRepository.clearPasswordResetChallenge(user.id);
      throw new ApiError(400, "Verification code expired. Please request a new one.");
    }

    return user;
  }

  async requestPasswordReset(email: string) {
    const safeEmail = email.trim();
    const genericMessage = "If the email exists, a verification code was sent.";
    const user = await this.userRepository.findByEmail(safeEmail);

    if (!user) {
      return {
        message: genericMessage,
        expiresInMinutes: this.passwordResetExpiresInMinutes
      };
    }

    const verificationCode = this.createResetCode();
    const expiresAt = new Date(
      Date.now() + this.passwordResetExpiresInMinutes * 60 * 1000
    );

    await this.userRepository.setPasswordResetChallenge(user.id, {
      codeHash: this.hashResetCode(user.id, verificationCode),
      expiresAt
    });

    if (env.NODE_ENV !== "production") {
      console.info(
        `[auth] Password reset code for ${safeEmail}: ${verificationCode}`
      );
    }

    return {
      message: genericMessage,
      expiresInMinutes: this.passwordResetExpiresInMinutes,
      verificationCodePreview:
        env.NODE_ENV === "production" ? undefined : verificationCode
    };
  }

  async verifyPasswordResetCode(email: string, code: string) {
    const user = await this.getUserForReset(email);
    const codeHash = this.hashResetCode(user.id, code.trim());
    if (codeHash !== user.passwordResetCodeHash) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    return { verified: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.getUserForReset(email);
    const codeHash = this.hashResetCode(user.id, code.trim());
    if (codeHash !== user.passwordResetCodeHash) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(user.id, passwordHash);
    await this.userRepository.clearPasswordResetChallenge(user.id);

    return { message: "Password has been reset successfully." };
  }
}
