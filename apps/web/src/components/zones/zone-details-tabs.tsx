"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ContactSellerResponse,
  ListingOffer,
  ZoneDetails,
  ZoneSummary,
} from "@homemall/shared";
import { usePathname, useRouter } from "next/navigation";
import { FutureOutlookChart } from "@/components/charts/future-outlook-chart";
import { ScoreBreakdownChart } from "@/components/charts/score-breakdown-chart";
import { useI18n } from "@/components/i18n/i18n-provider";
import { PropertyMediaPreview } from "@/components/media/property-media-preview";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { buildGoogleMapsUrl, getListingMediaUrls } from "@/lib/media";
import { redirectToLoginWithReturn } from "@/lib/auth-client";
import {
  buildZoneRiskAlerts,
  estimateZoneTcl,
} from "@/lib/view-models/zone-details-view";
import { getLocalizedCityName, getLocalizedZoneName } from "@/lib/location-labels";
import {
  addOfferToCompareCart,
  getCompareOffersCart,
  getLikedOffers,
  subscribeToCompareChanges,
  subscribeToLikedOffersChanges,
  toggleLikedOffer,
} from "@/lib/offer-interactions";

const tabs = ["Overview", "Scores", "True Cost", "Future", "Risks"] as const;
type TabKey = (typeof tabs)[number];

const buildMapFallback = (centerLat: number, centerLng: number) => {
  const lat = centerLat.toFixed(4);
  const lng = centerLng.toFixed(4);
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "13",
    size: "1200x700",
    markers: `${lat},${lng},red-pushpin`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
};

const resolvePreviewImage = (candidate: ZoneSummary) => {
  if (
    typeof candidate.imageUrl === "string" &&
    candidate.imageUrl.trim().length > 0
  ) {
    return candidate.imageUrl.trim();
  }
  return buildMapFallback(candidate.centerLat, candidate.centerLng);
};

interface ListingsResponse {
  listings: ListingOffer[];
}

export function ZoneDetailsTabs({
  zone,
  relatedZones,
  isAuthenticated,
}: {
  zone: ZoneDetails;
  relatedZones: ZoneSummary[];
  isAuthenticated: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? `/zones/${zone.id}`;
  const [tab, setTab] = useState<TabKey>("Overview");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [offers, setOffers] = useState<ListingOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [contactingListingId, setContactingListingId] = useState<string | null>(
    null,
  );
  const [reportingListingId, setReportingListingId] = useState<string | null>(
    null,
  );
  const [likedOfferIds, setLikedOfferIds] = useState<string[]>([]);
  const [compareOfferIds, setCompareOfferIds] = useState<string[]>([]);

  const tcl = useMemo(() => estimateZoneTcl(zone), [zone]);
  const alerts = useMemo(() => buildZoneRiskAlerts(zone), [zone]);

  const fallbackMapImage = useMemo(
    () => buildMapFallback(zone.centerLat, zone.centerLng),
    [zone.centerLat, zone.centerLng],
  );
  const isRtl = locale === "ar";
  const displayCity = getLocalizedCityName(zone.city, locale);
  const displayZoneName = getLocalizedZoneName(zone.name, zone.city, locale);
  const zoneMapsUrl = useMemo(
    () =>
      buildGoogleMapsUrl(
        zone.centerLat,
        zone.centerLng,
        `${displayZoneName}, ${displayCity}`,
        locale,
      ),
    [displayCity, displayZoneName, locale, zone.centerLat, zone.centerLng],
  );

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      setOffersLoading(true);
      try {
        const response = await clientApi<ListingsResponse>(
          `/api/listings?zoneId=${encodeURIComponent(zone.id)}&limit=12`,
        );
        if (!cancelled) {
          setOffers(response.listings);
        }
      } catch {
        if (!cancelled) {
          setOffers([]);
        }
      } finally {
        if (!cancelled) {
          setOffersLoading(false);
        }
      }
    };

    void loadOffers();
    return () => {
      cancelled = true;
    };
  }, [zone.id]);

  useEffect(() => {
    const sync = () => {
      setLikedOfferIds(getLikedOffers().map((item) => item.listingId));
      setCompareOfferIds(getCompareOffersCart().map((item) => item.listingId));
    };

    sync();
    const unsubscribeLikes = subscribeToLikedOffersChanges(sync);
    const unsubscribeCompare = subscribeToCompareChanges(sync);

    return () => {
      unsubscribeLikes();
      unsubscribeCompare();
    };
  }, []);

  const addToReport = async () => {
    if (!isAuthenticated) {
      redirectToLoginWithReturn(router, safePathname);
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await clientApi<{ favorite: { id: string } }>("/api/favorites", {
        method: "POST",
        body: JSON.stringify({
          zoneId: zone.id,
          note: "Added from zone details",
        }),
      });
      setFeedback("Zone added to your report candidates.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not save this zone right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  const contactSeller = async (listingId: string) => {
    if (!isAuthenticated) {
      redirectToLoginWithReturn(router, safePathname);
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
          : "Could not contact seller right now.",
      );
    } finally {
      setContactingListingId(null);
    }
  };

  const reportOffer = async (listingId: string) => {
    if (!isAuthenticated) {
      redirectToLoginWithReturn(router, safePathname);
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
          : "Could not send this report right now.",
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
    <section className="space-y-5">
      <Card className="rounded-3xl p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className={isRtl ? "text-right" : undefined}>
              <p className="text-sm text-brand-600">{displayCity}</p>
              <h1 className="font-[family-name:var(--font-heading)] text-5xl text-brand-900">
                {displayZoneName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  {t("common.score")} {zone.overallScore} / 100
                </Badge>
                {zone.flags.quiet ? (
                  <Badge tone="success">{t("zone.quiet")}</Badge>
                ) : (
                  <Badge tone="warning">{t("zone.noiseWatch")}</Badge>
                )}
                {zone.flags.floodRiskHigh ? (
                  <Badge tone="danger">{t("zone.floodRisk")}</Badge>
                ) : (
                  <Badge tone="success">{t("zone.lowerFloodRisk")}</Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href="/listings"
                className={buttonClassName("outline", "md")}
              >
                {t("action.postListing")}
              </Link>
              <Link
                href={`/compare?zoneA=${zone.id}`}
                className={buttonClassName("outline", "md")}
              >
                {t("action.compare")}
              </Link>
              {zoneMapsUrl ? (
                <a
                  href={zoneMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClassName("outline", "md")}
                >
                  {t("action.openGoogleMaps")}
                </a>
              ) : null}
              <Button type="button" onClick={addToReport} disabled={saving}>
                {saving ? t("onboarding.saving") : t("action.addToReport")}
              </Button>
            </div>
          </div>
          {zone.listing ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-3 text-sm text-brand-800">
              <p className="font-semibold text-brand-900">
                {zone.listing.title}
              </p>
              <p className="mt-1">
                {zone.listing.purpose === "rent"
                  ? `${formatCurrency(zone.listing.priceMonthly ?? 0)} / ${t("common.month")}`
                  : formatCurrency(zone.listing.priceSale ?? 0)}
                {" • "}
                {zone.listing.areaM2
                  ? `${zone.listing.areaM2.toFixed(0)} m²`
                  : "m² n/a"}
                {" • "}
                {zone.listing.bedrooms
                  ? `${zone.listing.bedrooms.toFixed(0)} bd`
                  : "bd n/a"}
                {" • "}
                {zone.listing.bathrooms
                  ? `${zone.listing.bathrooms.toFixed(0)} ba`
                  : "ba n/a"}
              </p>
            </div>
          ) : null}
          {feedback ? (
            <p className="text-sm text-brand-700">{feedback}</p>
          ) : null}
        </div>
      </Card>

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("zone.offersTitle")}</CardTitle>
            <p className="mt-1 text-sm text-brand-700">
              {t("zone.offersHint")}
            </p>
          </div>
          <Link href="/listings" className={buttonClassName("outline", "sm")}>
            {t("action.postListing")}
          </Link>
        </div>

        {offersLoading ? (
          <p className="mt-3 text-sm text-brand-700">
            {t("zone.loadingOffers")}
          </p>
        ) : offers.length === 0 ? (
          <p className="mt-3 text-sm text-brand-700">{t("zone.noOffers")}</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => {
              const previewImage =
                getListingMediaUrls(offer)[0] || fallbackMapImage;
              const mapsUrl = buildGoogleMapsUrl(
                offer.zoneCenterLat,
                offer.zoneCenterLng,
                offer.zoneName && offer.zoneCity
                  ? `${offer.zoneName}, ${offer.zoneCity}`
                  : offer.zoneName,
                locale,
              );
              const priceText =
                offer.purpose === "rent"
                  ? `${formatCurrency(offer.priceMonthly ?? 0)} / ${t("common.month")}`
                  : formatCurrency(offer.priceSale ?? 0);

              return (
                <article
                  key={offer.id}
                  className="overflow-hidden rounded-2xl border border-brand-200 bg-white"
                >
                  <PropertyMediaPreview
                    src={previewImage}
                    alt={offer.title}
                    className="h-36 w-full object-cover"
                    fallbackSrc={fallbackMapImage}
                    videoClassName="h-36 w-full object-cover"
                  />
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-1 font-semibold text-brand-900">
                      {offer.title}
                    </p>
                    {offer.seller ? (
                      <p className="text-xs text-brand-700">
                        {offer.seller.displayName || offer.seller.email}
                      </p>
                    ) : null}
                    <p className="text-sm text-brand-800">{priceText}</p>
                    <p className="text-xs text-brand-700">
                      {offer.areaM2
                        ? `${offer.areaM2.toFixed(0)} m²`
                        : "m² n/a"}{" "}
                      •{" "}
                      {offer.bedrooms
                        ? `${offer.bedrooms.toFixed(0)} bd`
                        : "bd n/a"}{" "}
                      •{" "}
                      {offer.bathrooms
                        ? `${offer.bathrooms.toFixed(0)} ba`
                        : "ba n/a"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => contactSeller(offer.id)}
                      disabled={contactingListingId === offer.id}
                    >
                        {contactingListingId === offer.id
                          ? t("action.running")
                          : t("action.contactSeller")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        compareOfferIds.includes(offer.id) ? "secondary" : "outline"
                      }
                      onClick={() => addOfferToCompare(offer)}
                    >
                      {compareOfferIds.includes(offer.id)
                        ? "Added to compare"
                        : "Add to compare"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        likedOfferIds.includes(offer.id) ? "secondary" : "outline"
                      }
                      onClick={() => toggleOfferLike(offer)}
                    >
                      {likedOfferIds.includes(offer.id) ? "Liked" : "Like"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reportOffer(offer.id)}
                      disabled={reportingListingId === offer.id}
                    >
                      {reportingListingId === offer.id
                        ? t("action.running")
                        : "Report offer"}
                    </Button>
                    <Link
                      href={`/agents/${offer.sellerId}`}
                      className={buttonClassName("outline", "sm")}
                    >
                      {t("action.viewSeller")}
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
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <SegmentedTabs
        items={[
          t("zone.tabs.overview"),
          t("zone.tabs.scores"),
          t("zone.tabs.trueCost"),
          t("zone.tabs.future"),
          t("zone.tabs.risks"),
        ]}
        value={t(
          `zone.tabs.${tab === "True Cost" ? "trueCost" : tab.toLowerCase()}`,
        )}
        onChange={(value) => {
          const nextTab =
            value === t("zone.tabs.overview")
              ? "Overview"
              : value === t("zone.tabs.scores")
                ? "Scores"
                : value === t("zone.tabs.trueCost")
                  ? "True Cost"
                  : value === t("zone.tabs.future")
                    ? "Future"
                    : "Risks";
          setTab(nextTab);
        }}
      />

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Card>
            <CardTitle>{t("zone.why")}</CardTitle>
            <div className="mt-3 space-y-3 text-sm text-brand-800">
              <div>
                <p className="font-semibold text-brand-900">
                  {t("zone.topPositives")}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {zone.score.topPositives.length
                    ? zone.score.topPositives.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    : zone.score.explanations
                        .slice(0, 3)
                        .map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-brand-900">
                  {t("zone.risks")}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {zone.score.topRisks.length ? (
                    zone.score.topRisks.map((item) => (
                      <li key={item}>{item}</li>
                    ))
                  ) : (
                    <li>{t("zone.noMajorRisks")}</li>
                  )}
                </ul>
              </div>
              {zone.score.assumptions.length ? (
                <div>
                  <p className="font-semibold text-brand-900">
                    {t("zone.assumptions")}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {zone.score.assumptions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardTitle>{t("zone.alerts")}</CardTitle>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-brand-800">
              {alerts.length ? (
                alerts.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>{t("zone.noRiskAlerts")}</li>
              )}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "Scores" ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <ScoreBreakdownChart breakdown={zone.score.breakdown} />
          <Card>
            <CardTitle>{t("zone.scoreDetail")}</CardTitle>
            <ul className="mt-3 space-y-1 text-sm text-brand-800">
              <li>
                {t("score.life")}: {zone.score.breakdown.qualityOfLife}
              </li>
              <li>
                {t("score.mobility")}: {zone.score.breakdown.mobility}
              </li>
              <li>
                {t("score.health")}: {zone.score.breakdown.health}
              </li>
              <li>
                {t("score.climate")}: {zone.score.breakdown.climateRisk}
              </li>
              <li>
                {t("score.services")}: {zone.score.breakdown.services}
              </li>
              <li>
                {t("score.future")}: {zone.score.breakdown.futureValue}
              </li>
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "True Cost" ? (
        <Card>
          <CardTitle>{t("zone.trueCost")}</CardTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                <tr className="border-b border-brand-100">
                  <td className="py-2">{t("tcl.housing")}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.housing)}
                  </td>
                </tr>
                <tr className="border-b border-brand-100">
                  <td className="py-2">{t("tcl.commute")}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.commute)}
                  </td>
                </tr>
                <tr className="border-b border-brand-100">
                  <td className="py-2">Utilities</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.utilities)}
                  </td>
                </tr>
                <tr className="border-b border-brand-100">
                  <td className="py-2">{t("score.health")}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.health)}
                  </td>
                </tr>
                <tr className="border-b border-brand-100">
                  <td className="py-2">{t("zone.risks")}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.risk)}
                  </td>
                </tr>
                <tr className="border-b border-brand-100">
                  <td className="py-2">Services friction</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.services)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2">{t("tcl.totalMonthly")}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(tcl.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === "Future" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <FutureOutlookChart outlook={zone.futureOutlook} />
          <Card className="text-sm text-brand-800">
            <CardTitle>{t("zone.future")}</CardTitle>
            <p className="mt-3">
              5 years: {zone.futureOutlook.years5}% projected movement.
            </p>
            <p className="mt-2">
              10 years: {zone.futureOutlook.years10}% projected movement.
            </p>
            <p className="mt-3">{zone.futureOutlook.explanation}</p>
          </Card>
        </div>
      ) : null}

      {tab === "Risks" ? (
        <Card className="text-sm text-brand-800">
          <CardTitle>{t("zone.riskIndicators")}</CardTitle>
          <ul className="mt-3 space-y-2">
            <li>Pollen index: {zone.metrics.pollenIndex}</li>
            <li>Heat index: {zone.metrics.heatIndex}</li>
            <li>Flood risk index: {zone.metrics.floodRiskIndex}</li>
            <li>Zoning risk index: {zone.metrics.zoningRiskIndex}</li>
          </ul>
          {zone.score.penalties.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {zone.score.penalties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4">{t("zone.noPenalties")}</p>
          )}
        </Card>
      ) : null}

      {relatedZones.length ? (
        <Card>
          <CardTitle>{t("zone.moreMatches")}</CardTitle>
          <p className="mt-1 text-sm text-brand-700">
            {t("zone.moreMatchesHint")}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedZones.map((candidate) => {
              const image = resolvePreviewImage(candidate);
              const listingTotal = candidate.listingInventory?.total ?? 0;
              const scoreTone =
                candidate.overallScore >= 60
                  ? "success"
                  : candidate.overallScore >= 50
                    ? "warning"
                    : "danger";

              return (
                <article
                  key={candidate.id}
                  className="overflow-hidden rounded-2xl border border-brand-200 bg-white"
                >
                  <img
                    src={image}
                    alt={`${candidate.name} preview`}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      const fallback = buildMapFallback(
                        candidate.centerLat,
                        candidate.centerLng,
                      );
                      if (event.currentTarget.src !== fallback) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="space-y-2 p-3">
                    <p className="text-xs text-brand-700">{candidate.city}</p>
                    <p className="truncate font-semibold text-brand-900">
                      {candidate.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={scoreTone}>
                        {t("common.score")} {candidate.overallScore.toFixed(1)}
                      </Badge>
                      <Badge tone="warning">
                        {t("listing.total")}: {listingTotal}
                      </Badge>
                    </div>
                    <Link
                      href={`/zones/${candidate.id}`}
                      className={buttonClassName("outline", "sm")}
                    >
                      {t("action.openDetails")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
