import type { PropertyListing } from "@homemall/shared";

const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
const googleMapsRegion = "MA";

const getGoogleMapsLanguage = (locale?: string) => {
  if (locale === "ar") {
    return "ar";
  }
  if (locale === "fr") {
    return "fr";
  }
  if (locale === "en") {
    return "en";
  }
  return undefined;
};

export const isVideoUrl = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return videoExtensions.some((extension) => normalized.includes(extension));
};

export const getListingMediaUrls = (
  listing: Pick<PropertyListing, "imageUrl" | "imageUrls">,
): string[] => {
  const fromLead =
    typeof listing.imageUrl === "string" && listing.imageUrl.trim().length > 0
      ? [listing.imageUrl.trim()]
      : [];
  const fromGallery = Array.isArray(listing.imageUrls)
    ? listing.imageUrls
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    : [];

  return Array.from(new Set([...fromLead, ...fromGallery]));
};

export const buildGoogleMapsUrl = (
  lat: number | undefined,
  lng: number | undefined,
  label?: string,
  locale?: string,
): string | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const query = label?.trim()
    ? `${lat},${lng} (${label.trim()})`
    : `${lat},${lng}`;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  url.searchParams.set("gl", googleMapsRegion);

  const language = getGoogleMapsLanguage(locale);
  if (language) {
    url.searchParams.set("hl", language);
  }

  return url.toString();
};
