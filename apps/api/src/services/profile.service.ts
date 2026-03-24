import type { UserProfileInput } from "@homemall/shared";
import { ApiError } from "../middlewares/error.middleware.js";
import { ProfileRepository } from "../repositories/profile.repository.js";
import { fromPrismaProfile } from "./mappers.js";

export class ProfileService {
  private profileRepository = new ProfileRepository();

  async upsert(userId: string, payload: UserProfileInput): Promise<UserProfileInput> {
    const profile = await this.profileRepository.upsertByUserId(userId, payload);
    return fromPrismaProfile(profile);
  }

  async getByUser(userId: string): Promise<UserProfileInput> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }
    return fromPrismaProfile(profile);
  }

  async maybeGetByUser(userId: string): Promise<UserProfileInput | null> {
    const profile = await this.profileRepository.findByUserId(userId);
    return profile ? fromPrismaProfile(profile) : null;
  }
}
