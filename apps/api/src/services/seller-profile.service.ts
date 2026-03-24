import type {
  ListingOffer,
  ListingTypeCounts,
  SellerProfile,
  SellerVerificationLevel,
} from "@homemall/shared";
import { ApiError } from "../middlewares/error.middleware.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ListingService } from "./listing.service.js";
import {
  deriveSellerCompanyName,
  deriveSellerDisplayName,
  deriveSellerInitials,
} from "./seller-public.utils.js";

const emptyTypeCounts = (): ListingTypeCounts => ({
  apartment: 0,
  house: 0,
  studio: 0,
  villa: 0,
  land: 0,
  total: 0,
});

const toVerificationLevel = (activeListings: number): SellerVerificationLevel => {
  if (activeListings >= 12) {
    return "trusted";
  }
  if (activeListings >= 3) {
    return "verified";
  }
  return "new";
};

const buildAbout = (listings: ListingOffer[], serviceAreas: string[]) => {
  if (listings.length === 0) {
    return "This seller has not published public listings yet.";
  }

  const rentListings = listings.filter((listing) => listing.purpose === "rent").length;
  const saleListings = listings.length - rentListings;
  const focus =
    rentListings > 0 && saleListings > 0
      ? "rent and sale"
      : rentListings > 0
        ? "rental"
        : "sale";

  const areaLabel = serviceAreas.length > 0 ? serviceAreas.join(", ") : "Morocco";
  return `Active on HomeMall with ${listings.length} live ${listings.length === 1 ? "listing" : "listings"} across ${areaLabel}. Focused on ${focus} offers with direct response options.`;
};

const firstDefined = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
};

export class SellerProfileService {
  private readonly userRepository = new UserRepository();
  private readonly listingService = new ListingService();

  async getPublicProfile(sellerId: string): Promise<SellerProfile> {
    const user = await this.userRepository.findById(sellerId);
    if (!user) {
      throw new ApiError(404, "Seller not found");
    }

    const listings = await this.listingService.listPublicBySeller(sellerId, 60);
    const primaryArea = listings[0]?.zoneCity;
    const displayName = user.displayName?.trim() || deriveSellerDisplayName(user.email);
    const companyName = deriveSellerCompanyName(user.email, primaryArea);
    const propertyTypeCounts = listings.reduce<ListingTypeCounts>((counts, listing) => {
      counts[listing.type] += 1;
      counts.total += 1;
      return counts;
    }, emptyTypeCounts());
    const serviceAreas = Array.from(
      new Set(
        listings
          .map((listing) => listing.zoneCity?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const rentListings = listings.filter((listing) => listing.purpose === "rent").length;
    const saleListings = listings.length - rentListings;
    const verificationLevel = toVerificationLevel(listings.length);
    const contactPhone = firstDefined(
      ...listings.map((listing) => listing.contactPhone),
      user.contactPhone ?? undefined,
    );
    const contactEmail = firstDefined(...listings.map((listing) => listing.contactEmail), user.email);
    const contactWhatsApp = firstDefined(
      ...listings.map((listing) => listing.contactWhatsApp),
      user.contactWhatsApp ?? undefined,
      contactPhone,
    );
    const contactInstagram = firstDefined(
      ...listings.map((listing) => listing.contactInstagram),
      user.contactInstagram ?? undefined,
    );
    const contactFacebook = firstDefined(
      ...listings.map((listing) => listing.contactFacebook),
      user.contactFacebook ?? undefined,
    );
    const contactWebsite = firstDefined(
      ...listings.map((listing) => listing.contactWebsite),
      user.contactWebsite ?? undefined,
    );

    return {
      id: user.id,
      displayName,
      email: user.email,
      companyName,
      avatarUrl: user.avatarUrl ?? undefined,
      avatarInitials: deriveSellerInitials(displayName),
      verificationLevel,
      about: buildAbout(listings, serviceAreas),
      languages: ["Arabic", "French", "English"],
      contactPhone,
      contactEmail,
      contactWhatsApp,
      contactInstagram,
      contactFacebook,
      contactWebsite,
      featuredListingId: listings[0]?.id,
      coverImageUrl: listings.find((listing) => listing.imageUrl)?.imageUrl,
      memberSince: user.createdAt.toISOString(),
      stats: {
        activeListings: listings.length,
        rentListings,
        saleListings,
        serviceAreas,
        propertyTypeCounts,
      },
      listings,
    };
  }
}
