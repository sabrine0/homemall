"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ContactSellerResponse,
  ListingOffer,
  ListingPropertyType,
  SellerProfile,
} from "@homemall/shared";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/i18n-provider";
import { PropertyMediaPreview } from "@/components/media/property-media-preview";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { redirectToLoginWithReturn } from "@/lib/auth-client";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { buildGoogleMapsUrl, getListingMediaUrls } from "@/lib/media";
import {
  addOfferToCompareCart,
  getCompareOffersCart,
  getLikedOffers,
  subscribeToCompareChanges,
  subscribeToLikedOffersChanges,
  toggleLikedOffer,
} from "@/lib/offer-interactions";

const typeOptions: Array<"all" | ListingPropertyType> = [
  "all",
  "apartment",
  "house",
  "studio",
  "villa",
  "land",
];

const formatListingPrice = (
  listing: ListingOffer,
  monthLabel: string,
): string =>
  listing.purpose === "rent"
    ? `${formatCurrency(listing.priceMonthly ?? 0)} / ${monthLabel}`
    : formatCurrency(listing.priceSale ?? 0);

const formatPhoneForLink = (value: string) => value.replace(/[^\d+]/g, "");

const resolveSocialUrl = (
  value: string | undefined,
  platform: "instagram" | "facebook",
): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const handle = raw.replace(/^@/, "").replace(/^\//, "");
  if (!handle) {
    return null;
  }

  return platform === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://facebook.com/${handle}`;
};

export function AgentProfileWorkspace({
  seller,
  isAuthenticated,
}: {
  seller: SellerProfile;
  isAuthenticated: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [purposeFilter, setPurposeFilter] = useState<"all" | "rent" | "buy">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | ListingPropertyType>(
    "all",
  );
  const [contactingListingId, setContactingListingId] = useState<string | null>(
    null,
  );
  const [reportingListingId, setReportingListingId] = useState<string | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [likedOfferIds, setLikedOfferIds] = useState<string[]>([]);
  const [compareOfferIds, setCompareOfferIds] = useState<string[]>([]);

  const featuredListing = useMemo(
    () =>
      seller.listings.find((listing) => listing.id === seller.featuredListingId) ??
      seller.listings[0],
    [seller.featuredListingId, seller.listings],
  );

  const visibleListings = useMemo(
    () =>
      seller.listings.filter((listing) => {
        if (purposeFilter !== "all" && listing.purpose !== purposeFilter) {
          return false;
        }
        if (typeFilter !== "all" && listing.type !== typeFilter) {
          return false;
        }
        return true;
      }),
    [purposeFilter, seller.listings, typeFilter],
  );

  const verificationTone =
    seller.verificationLevel === "trusted"
      ? "success"
      : seller.verificationLevel === "verified"
        ? "neutral"
        : "warning";

  const requireLogin = () => {
    if (!isAuthenticated) {
      redirectToLoginWithReturn(router, `/agents/${seller.id}`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    setLikedOfferIds(getLikedOffers().map((item) => item.listingId));
    setCompareOfferIds(getCompareOffersCart().map((item) => item.listingId));
  }, []);

  useEffect(() => {
    const sync = () => {
      setLikedOfferIds(getLikedOffers().map((item) => item.listingId));
      setCompareOfferIds(getCompareOffersCart().map((item) => item.listingId));
    };
    const unsubscribeLikes = subscribeToLikedOffersChanges(sync);
    const unsubscribeCompare = subscribeToCompareChanges(sync);
    return () => {
      unsubscribeLikes();
      unsubscribeCompare();
    };
  }, []);

  const contactSeller = async (listingId?: string) => {
    if (!listingId) {
      setFeedback("No active listing is available for chat yet.");
      return;
    }

    if (!requireLogin()) {
      return;
    }

    setContactingListingId(listingId);
    setFeedback(null);

    try {
      const response = await clientApi<ContactSellerResponse>(
        `/api/listings/${listingId}/contact`,
        {
          method: "POST",
          body: JSON.stringify({
            initialMessage: t("zone.messageSellerPrompt"),
          }),
        },
      );
      router.push(`/messages?conversationId=${response.conversation.id}`);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not open the conversation right now.",
      );
    } finally {
      setContactingListingId(null);
    }
  };

  const startEmail = (email?: string) => {
    const targetEmail = email?.trim() || seller.contactEmail || seller.email;
    if (!targetEmail) {
      setFeedback("No email provided by this seller.");
      return;
    }

    if (!requireLogin()) {
      return;
    }

    window.location.href = `mailto:${targetEmail}`;
  };

  const startCall = (phone?: string) => {
    if (!phone?.trim()) {
      setFeedback(t("seller.noPhone"));
      return;
    }

    if (!requireLogin()) {
      return;
    }

    window.location.href = `tel:${formatPhoneForLink(phone)}`;
  };

  const startWhatsApp = (phone?: string) => {
    if (!phone?.trim()) {
      setFeedback(t("seller.noPhone"));
      return;
    }

    if (!requireLogin()) {
      return;
    }

    window.open(`https://wa.me/${formatPhoneForLink(phone)}`, "_blank");
  };

  const openSocial = (url: string | null, platformLabel: string) => {
    const raw = url?.trim();
    if (!raw) {
      setFeedback(`No ${platformLabel} profile provided by this seller.`);
      return;
    }
    if (!requireLogin()) {
      return;
    }
    const target =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const reportOffer = async (listingId: string) => {
    if (!requireLogin()) {
      return;
    }

    const reasonInput = window.prompt(
      "Tell us why this offer should be reported to admin.",
    );
    const reason = reasonInput?.trim();
    if (!reason) {
      return;
    }

    setReportingListingId(listingId);
    setFeedback(null);

    try {
      await clientApi<{ report: { id: string } }>(
        `/api/listings/${listingId}/report`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
      );
      setFeedback("Report submitted to admin.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not submit this report right now.",
      );
    } finally {
      setReportingListingId(null);
    }
  };

  const addOfferToCompare = (offer: ListingOffer) => {
    const result = addOfferToCompareCart(offer);
    setCompareOfferIds(result.items.map((item) => item.listingId));

    if (result.status === "exists") {
      setFeedback("Offer already in compare.");
      return;
    }

    if (result.status === "full") {
      setFeedback("You added 6 offers. Go to Compare.");
      return;
    }

    if (result.items.length >= 6) {
      setFeedback("You added 6 offers. Go to Compare.");
      return;
    }

    setFeedback("Offer added to compare.");
  };

  const toggleOfferLike = (offer: ListingOffer) => {
    const result = toggleLikedOffer(offer);
    setLikedOfferIds(result.items.map((item) => item.listingId));
    setFeedback(
      result.liked
        ? "Offer liked. You can find it in profile."
        : "Offer removed from likes.",
    );
  };

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 md:px-6">
      <div>
        <Link href="/zones" className="text-sm font-semibold text-brand-700 underline">
          {t("common.backToExplorer")}
        </Link>
      </div>

      <Card className="overflow-hidden rounded-3xl p-0">
        <div className="relative h-44 overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700">
          {seller.coverImageUrl ? (
            <>
              <PropertyMediaPreview
                src={seller.coverImageUrl}
                alt={seller.displayName}
                className="h-full w-full object-cover object-center opacity-35"
                videoClassName="h-full w-full object-cover object-center opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-900/85 via-brand-900/55 to-brand-700/60" />
            </>
          ) : null}

          <div className="absolute inset-0 flex items-start justify-end p-5">
            <Badge tone={verificationTone}>{t(`seller.badge.${seller.verificationLevel}`)}</Badge>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {seller.avatarUrl ? (
                <img
                  src={seller.avatarUrl}
                  alt={seller.displayName}
                  className="-mt-16 h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-panel"
                />
              ) : (
                <div className="-mt-16 flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-brand-700 text-3xl font-bold text-white shadow-panel">
                  {seller.avatarInitials}
                </div>
              )}

              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
                    {seller.companyName}
                  </p>
                  <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900 md:text-5xl">
                    {seller.displayName}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-brand-700">
                  <Badge tone="success">
                    {seller.stats.activeListings} {t("seller.activeProperties")}
                  </Badge>
                  <span>
                    {t("seller.rentSplit")}: {seller.stats.rentListings}
                  </span>
                  <span>
                    {t("seller.saleSplit")}: {seller.stats.saleListings}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => startEmail(seller.contactEmail)}
              >
                {t("action.email")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => startCall(seller.contactPhone)}
              >
                {t("action.call")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  startWhatsApp(seller.contactWhatsApp || seller.contactPhone)
                }
              >
                {t("action.whatsApp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  openSocial(
                    resolveSocialUrl(seller.contactInstagram, "instagram"),
                    "Instagram",
                  )
                }
              >
                Instagram
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  openSocial(
                    resolveSocialUrl(seller.contactFacebook, "facebook"),
                    "Facebook",
                  )
                }
              >
                Facebook
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openSocial(seller.contactWebsite ?? null, "website")}
              >
                Website
              </Button>
              <Button
                type="button"
                onClick={() => contactSeller(featuredListing?.id)}
                disabled={
                  Boolean(featuredListing?.id) &&
                  contactingListingId === featuredListing?.id
                }
              >
                {contactingListingId === featuredListing?.id
                  ? t("action.running")
                  : t("action.contactSeller")}
              </Button>
            </div>
          </div>

          {feedback ? <p className="text-sm text-brand-700">{feedback}</p> : null}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl">
          <CardTitle>{t("seller.aboutTitle")}</CardTitle>
          <CardDescription className="mt-2">{seller.about}</CardDescription>

          <div className="mt-4 flex flex-wrap gap-2">
            {seller.languages.map((language) => (
              <Badge key={language} tone="neutral">
                {language}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl">
          <CardTitle>{t("seller.statsTitle")}</CardTitle>
          <div className="mt-3 grid gap-3 text-sm text-brand-800">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-600">
                {t("seller.serviceAreas")}
              </p>
              <p className="mt-1 font-semibold text-brand-900">
                {seller.stats.serviceAreas.length
                  ? seller.stats.serviceAreas.join(" • ")
                  : "Morocco"}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-600">
                {t("seller.memberSince")}
              </p>
              <p className="mt-1 font-semibold text-brand-900">
                {new Intl.DateTimeFormat("en-GB", {
                  year: "numeric",
                  month: "long",
                }).format(new Date(seller.memberSince))}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-600">
                {t("seller.propertyMix")}
              </p>
              <p className="mt-1 font-semibold text-brand-900">
                {typeOptions
                  .filter((type): type is ListingPropertyType => type !== "all")
                  .map((type) => ({
                    key: type,
                    count: seller.stats.propertyTypeCounts[type],
                  }))
                  .filter((item) => item.count > 0)
                  .map((item) => `${t(`listing.${item.key}`)} ${item.count}`)
                  .join(" • ") || t("seller.noListings")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{t("seller.filtersTitle")}</CardTitle>
            <CardDescription className="mt-1">
              {t("seller.showing")}: {visibleListings.length} / {seller.listings.length}
            </CardDescription>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-brand-800">
              {t("seller.filterPurpose")}
              <select
                value={purposeFilter}
                onChange={(event) =>
                  setPurposeFilter(event.target.value as "all" | "rent" | "buy")
                }
                className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2"
              >
                <option value="all">{t("seller.allPurposes")}</option>
                <option value="rent">{t("goal.rent")}</option>
                <option value="buy">{t("goal.buy")}</option>
              </select>
            </label>

            <label className="text-sm text-brand-800">
              {t("seller.filterType")}
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "all" | ListingPropertyType)
                }
                className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2"
              >
                <option value="all">{t("seller.allTypes")}</option>
                {typeOptions
                  .filter((type): type is ListingPropertyType => type !== "all")
                  .map((type) => (
                    <option key={type} value={type}>
                      {t(`listing.${type}`)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {visibleListings.length === 0 ? (
            <p className="text-sm text-brand-700">{t("seller.noListings")}</p>
          ) : (
            visibleListings.map((listing) => {
                const media = getListingMediaUrls(listing)[0];
                const mapsUrl = buildGoogleMapsUrl(
                  listing.zoneCenterLat,
                  listing.zoneCenterLng,
                  listing.zoneName && listing.zoneCity
                    ? `${listing.zoneName}, ${listing.zoneCity}`
                    : listing.zoneName,
                  locale,
                );

                return (
                  <article
                    key={listing.id}
                    className="overflow-hidden rounded-3xl border border-brand-200 bg-white"
                  >
                    <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
                      <div className="relative h-64 bg-brand-100 lg:h-full">
                        {media ? (
                          <PropertyMediaPreview
                            src={media}
                            alt={listing.title}
                            className="h-full w-full object-cover"
                            videoClassName="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                tone={listing.purpose === "rent" ? "success" : "warning"}
                              >
                                {listing.purpose === "rent"
                                  ? t("goal.rent")
                                  : t("goal.buy")}
                              </Badge>
                              <Badge tone="neutral">{t(`listing.${listing.type}`)}</Badge>
                            </div>

                            <p className="text-3xl font-semibold text-brand-900">
                              {formatListingPrice(listing, t("common.month"))}
                            </p>
                            <p className="text-xl font-semibold text-brand-900">
                              {listing.title}
                            </p>
                            <p className="text-sm text-brand-700">
                              {listing.zoneName || t("nav.zones")}
                              {listing.zoneCity ? `, ${listing.zoneCity}` : ""}
                            </p>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                startEmail(listing.contactEmail || seller.contactEmail)
                              }
                            >
                              {t("action.email")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                startCall(listing.contactPhone || seller.contactPhone)
                              }
                            >
                              {t("action.call")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                startWhatsApp(
                                  listing.contactWhatsApp ||
                                    seller.contactWhatsApp ||
                                    listing.contactPhone ||
                                    seller.contactPhone,
                                )
                              }
                            >
                              {t("action.whatsApp")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openSocial(
                                  resolveSocialUrl(
                                    listing.contactInstagram ||
                                      seller.contactInstagram,
                                    "instagram",
                                  ),
                                  "Instagram",
                                )
                              }
                            >
                              Instagram
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openSocial(
                                  resolveSocialUrl(
                                    listing.contactFacebook ||
                                      seller.contactFacebook,
                                    "facebook",
                                  ),
                                  "Facebook",
                                )
                              }
                            >
                              Facebook
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openSocial(
                                  listing.contactWebsite ||
                                    seller.contactWebsite ||
                                    null,
                                  "website",
                                )
                              }
                            >
                              Website
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-brand-800">
                          <span>
                            {listing.bedrooms
                              ? `${listing.bedrooms.toFixed(0)} bd`
                              : "bd n/a"}
                          </span>
                          <span>
                            {listing.bathrooms
                              ? `${listing.bathrooms.toFixed(0)} ba`
                              : "ba n/a"}
                          </span>
                          <span>
                            {listing.areaM2
                              ? `${listing.areaM2.toFixed(0)} m²`
                              : "m² n/a"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => contactSeller(listing.id)}
                            disabled={contactingListingId === listing.id}
                          >
                            {contactingListingId === listing.id
                              ? t("action.running")
                              : t("action.contactSeller")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              compareOfferIds.includes(listing.id)
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() => addOfferToCompare(listing)}
                          >
                            {compareOfferIds.includes(listing.id)
                              ? "Added to compare"
                              : "Add to compare"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              likedOfferIds.includes(listing.id)
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() => toggleOfferLike(listing)}
                          >
                            {likedOfferIds.includes(listing.id) ? "Liked" : "Like"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => reportOffer(listing.id)}
                            disabled={reportingListingId === listing.id}
                          >
                            {reportingListingId === listing.id
                              ? t("action.running")
                              : "Report offer"}
                          </Button>
                          <Link
                            href={`/zones/${listing.zoneId}`}
                            className={buttonClassName("outline", "sm")}
                          >
                            {t("action.viewZone")}
                          </Link>
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonClassName("outline", "sm")}
                            >
                              {t("action.openGoogleMaps")}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
          )}
        </div>
      </Card>
    </main>
  );
}
