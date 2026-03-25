"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  InfoWindowF,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import type {
  Goal,
  ListingOffer,
  ListingTypeCounts,
  ZoneSummary,
} from "@homemall/shared";
import { useI18n } from "@/components/i18n/i18n-provider";
import { getScoreRange, getScoreTierInfo } from "@/lib/score-tier";
import { getLocalizedCityName, getLocalizedZoneName } from "@/lib/location-labels";
import {
  MOROCCO_BOUNDS,
  MOROCCO_CENTER,
} from "./morocco-map-geometry";
import type { LeafletMarkerModel } from "./zones-map-leaflet";

interface ZonesMapProps {
  zones: ZoneSummary[];
  liveListings?: ListingOffer[];
  selectedZoneId?: string;
  activeGoal?: Goal;
  onSelectZone?: (zone: ZoneSummary) => void;
}

type ListingKind = keyof Omit<ListingTypeCounts, "total">;

type MarkerModel = {
  zone: ZoneSummary;
  tier: "best" | "medium" | "worst";
  selected: boolean;
  inventory: {
    total: number;
    counts: Omit<ListingTypeCounts, "total">;
  };
  dominantTypeInfo: {
    type: ListingKind;
    count: number;
  };
  displayCity: string;
  displayZoneName: string;
  popupTitle: string;
  highlightedPrice?: number;
};

const LeafletZonesMap = dynamic(
  () =>
    import("./zones-map-leaflet").then((module) => module.ZonesMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[52vh] min-h-[340px] w-full items-center justify-center rounded-3xl border border-brand-200 bg-[#edf3f0] px-6 text-sm text-slate-600 shadow-panel">
        Loading map...
      </div>
    ),
  },
);

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

const listingTypeKeys: ListingKind[] = [
  "apartment",
  "house",
  "studio",
  "villa",
  "land",
];

const propertyTypeToIcon: Record<string, string> = {
  house: "🏠",
  apartment: "🏢",
  studio: "🛏️",
  land: "🌍",
  building: "🏬",
};

const activePurpose = (goal: Goal | undefined): "rent" | "buy" | "all" => {
  if (goal === "rent") return "rent";
  if (goal === "buy" || goal === "sell") return "buy";
  return "all";
};

const emptyCounts = (): Omit<ListingTypeCounts, "total"> => ({
  apartment: 0,
  house: 0,
  studio: 0,
  villa: 0,
  land: 0,
});

const getLiveListingCounts = (
  zoneId: string,
  purpose: "rent" | "buy" | "all",
  liveListings: ListingOffer[] | undefined,
) => {
  if (!liveListings?.length) {
    return null;
  }

  const counts = emptyCounts();
  let total = 0;

  liveListings.forEach((listing) => {
    if (listing.zoneId !== zoneId) {
      return;
    }

    if (purpose !== "all" && listing.purpose !== purpose) {
      return;
    }

    counts[listing.type] += 1;
    total += 1;
  });

  if (total === 0) {
    return null;
  }

  return {
    total,
    counts,
  };
};

const extractCounts = (
  zone: ZoneSummary,
  purpose: "rent" | "buy" | "all",
  liveListings?: ListingOffer[],
) => {
  const liveCounts = getLiveListingCounts(zone.id, purpose, liveListings);
  if (liveCounts) {
    return liveCounts;
  }

  const inventory = zone.listingInventory;
  if (!inventory) {
    return {
      total: 0,
      counts: emptyCounts(),
    };
  }

  if (purpose === "rent" || purpose === "buy") {
    const selected = inventory[purpose];
    return {
      total: selected.total,
      counts: {
        apartment: selected.apartment,
        house: selected.house,
        studio: selected.studio,
        villa: selected.villa,
        land: selected.land,
      },
    };
  }

  return {
    total: inventory.total,
    counts: {
      apartment: inventory.rent.apartment + inventory.buy.apartment,
      house: inventory.rent.house + inventory.buy.house,
      studio: inventory.rent.studio + inventory.buy.studio,
      villa: inventory.rent.villa + inventory.buy.villa,
      land: inventory.rent.land + inventory.buy.land,
    },
  };
};

const getLiveListingsForZone = (
  zoneId: string,
  purpose: "rent" | "buy" | "all",
  liveListings?: ListingOffer[],
) => {
  if (!liveListings?.length) {
    return [];
  }

  return liveListings.filter((listing) => {
    if (listing.zoneId !== zoneId) {
      return false;
    }

    if (purpose !== "all" && listing.purpose !== purpose) {
      return false;
    }

    return true;
  });
};

const getDominantListingTypeInfo = (
  counts: Omit<ListingTypeCounts, "total">,
): { type: ListingKind; count: number } | null => {
  const ranked = listingTypeKeys
    .map((key) => ({ key, count: counts[key] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return ranked[0]
    ? {
        type: ranked[0].key,
        count: ranked[0].count,
      }
    : null;
};

const formatOfferCount = (value: number, max: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value > max) return `${max}+`;
  return String(Math.round(value));
};

const getPropertyTypeIcon = (listingType: ListingKind) => {
  if (listingType === "villa") {
    return propertyTypeToIcon.house;
  }
  return propertyTypeToIcon[listingType] ?? "📍";
};

const tierColor = (tier: "best" | "medium" | "worst") => {
  if (tier === "best") return "#1f9d55";
  if (tier === "worst") return "#dc2626";
  return "#f59e0b";
};

const buildMarkerIcon = ({
  tier,
  selected,
  label,
}: {
  tier: "best" | "medium" | "worst";
  selected: boolean;
  label: string;
}) => {
  const gmaps = (window as { google?: any }).google;
  if (!gmaps?.maps) {
    return undefined;
  }

  const width = Math.max(selected ? 80 : 72, 40 + label.length * 7);
  const height = selected ? 40 : 34;
  const fill = tierColor(tier);
  const strokeWidth = selected ? 4 : 3;
  const radius = height / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="#ffffff" stroke-width="${strokeWidth}" />
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new gmaps.maps.Size(width, height),
    anchor: new gmaps.maps.Point(width / 2, height / 2),
    labelOrigin: new gmaps.maps.Point(width / 2, height / 2 + 4),
  };
};

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const googleMapsRegion = "MA";

const getGoogleMapsLanguage = (locale: string) => {
  if (locale === "ar") {
    return "ar";
  }
  if (locale === "fr") {
    return "fr";
  }
  return "en";
};

const MAP_POLITICAL_HIDE_STYLES = [
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

export function ZonesMap({
  zones,
  liveListings,
  selectedZoneId,
  activeGoal,
  onSelectZone,
}: ZonesMapProps) {
  const { t, locale } = useI18n();
  const purpose = activePurpose(activeGoal);
  const googleMapsLanguage = getGoogleMapsLanguage(locale);
  const mapRef = useRef<any>(null);
  const [openPopupZoneId, setOpenPopupZoneId] = useState<string | null>(
    selectedZoneId ?? null,
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: `homemall-google-maps-${googleMapsLanguage}`,
    googleMapsApiKey,
    language: googleMapsLanguage,
    region: googleMapsRegion,
  });

  useEffect(() => {
    setOpenPopupZoneId(selectedZoneId ?? null);
  }, [selectedZoneId]);

  const markerModels = useMemo<MarkerModel[]>(() => {
    const scoreRange = getScoreRange(zones.map((zone) => zone.overallScore));
    const hasLiveListings = Boolean(liveListings && liveListings.length > 0);

    return zones.flatMap((zone) => {
      const tier = getScoreTierInfo(zone.overallScore, scoreRange);
      const selected = zone.id === selectedZoneId;
      const displayCity = getLocalizedCityName(zone.city, locale);
      const displayZoneName = getLocalizedZoneName(zone.name, zone.city, locale);
      const zoneLiveListings = getLiveListingsForZone(zone.id, purpose, liveListings);

      if (hasLiveListings && zoneLiveListings.length === 0) {
        return [];
      }

      const inventory = extractCounts(zone, purpose, liveListings);
      const dominantTypeInfo = getDominantListingTypeInfo(inventory.counts);
      if (!dominantTypeInfo || inventory.total === 0) {
        return [];
      }

      const highlightedListing =
        zoneLiveListings.find(
          (listing) => listing.type === dominantTypeInfo.type,
        ) ?? zoneLiveListings[0];

      const highlightedPrice =
        highlightedListing &&
        typeof highlightedListing === "object" &&
        highlightedListing.purpose === "rent"
          ? highlightedListing.priceMonthly
          : highlightedListing?.priceSale;

      const popupTitle =
        highlightedListing?.title && highlightedListing.title.trim().length > 0
          ? highlightedListing.title
          : displayZoneName;

      return [
        {
          zone,
          tier: tier.tier,
          selected,
          inventory,
          dominantTypeInfo,
          displayCity,
          displayZoneName,
          popupTitle,
          highlightedPrice,
        },
      ];
    });
  }, [liveListings, locale, purpose, selectedZoneId, zones]);

  useEffect(() => {
    const gmaps = (window as { google?: any }).google;
    if (!isLoaded || !mapRef.current || !gmaps?.maps) {
      return;
    }

    const map = mapRef.current;
    if (markerModels.length === 0) {
      const fallbackBounds = new gmaps.maps.LatLngBounds(
        { lat: MOROCCO_BOUNDS.south, lng: MOROCCO_BOUNDS.west },
        { lat: MOROCCO_BOUNDS.north, lng: MOROCCO_BOUNDS.east },
      );
      map.fitBounds(fallbackBounds);
      map.setZoom(6);
      return;
    }

    if (markerModels.length === 1) {
      const zone = markerModels[0].zone;
      const singleZoneBounds = new gmaps.maps.LatLngBounds();
      singleZoneBounds.extend({ lat: zone.centerLat - 0.6, lng: zone.centerLng - 0.8 });
      singleZoneBounds.extend({ lat: zone.centerLat + 0.6, lng: zone.centerLng + 0.8 });
      map.fitBounds(singleZoneBounds, 36);
      map.setZoom(Math.min(map.getZoom() ?? 11, 10));
      return;
    }

    const bounds = new gmaps.maps.LatLngBounds();
    markerModels.forEach((item) => {
      bounds.extend({ lat: item.zone.centerLat, lng: item.zone.centerLng });
    });
    map.fitBounds(bounds, 36);
  }, [isLoaded, markerModels]);

  const markerByZoneId = useMemo(
    () => new Map(markerModels.map((item) => [item.zone.id, item])),
    [markerModels],
  );
  const openPopupMarker = openPopupZoneId
    ? markerByZoneId.get(openPopupZoneId)
    : undefined;

  if (!googleMapsApiKey || loadError) {
    return (
      <LeafletZonesMap
        markerModels={markerModels as LeafletMarkerModel[]}
        selectedZoneId={selectedZoneId}
        locale={locale}
        purposeLabel={
          purpose === "rent"
            ? t("listing.rent")
            : purpose === "buy"
              ? t("listing.sale")
              : t("listing.total")
        }
        scoreLabel={t("common.score")}
        tierLabels={{
          best: t("tier.best"),
          medium: t("tier.medium"),
          worst: t("tier.worst"),
        }}
        listingTypeLabel={(type) => t(`listing.${type}` as never)}
        onSelectZone={onSelectZone}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[52vh] min-h-[340px] w-full items-center justify-center rounded-3xl border border-brand-200 bg-[#edf3f0] px-6 text-sm text-slate-600 shadow-panel">
        Loading map...
      </div>
    );
  }

  return (
    <div className="h-[52vh] min-h-[340px] w-full overflow-hidden rounded-3xl border border-brand-200 bg-[#edf3f0] shadow-panel">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MOROCCO_CENTER}
        zoom={6}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        onClick={() => {
          setOpenPopupZoneId(null);
        }}
        options={{
          minZoom: 5,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: MAP_POLITICAL_HIDE_STYLES,
          restriction: {
            latLngBounds: MOROCCO_BOUNDS,
            strictBounds: false,
          },
        }}
      >
        <MarkerClustererF
          options={{
            maxZoom: 14,
            minimumClusterSize: 2,
          }}
        >
          {(clusterer) => (
            <>
              {markerModels.map((item) => {
                const countLabel = formatOfferCount(item.inventory.total, 99);
                const markerLabel = `${getPropertyTypeIcon(
                  item.dominantTypeInfo.type,
                )} ${countLabel}`;

                return (
                  <MarkerF
                    key={item.zone.id}
                    clusterer={clusterer}
                    position={{
                      lat: item.zone.centerLat,
                      lng: item.zone.centerLng,
                    }}
                    zIndex={item.selected ? 1000 : 1}
                    icon={buildMarkerIcon({
                      tier: item.tier,
                      selected: item.selected,
                      label: markerLabel,
                    })}
                    label={{
                      text: markerLabel,
                      color: "#ffffff",
                      fontWeight: "800",
                      fontSize: item.selected ? "13px" : "12px",
                    }}
                    onClick={() => {
                      setOpenPopupZoneId(item.zone.id);
                      onSelectZone?.(item.zone);
                    }}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>
        {openPopupMarker ? (
          <InfoWindowF
            position={{
              lat: openPopupMarker.zone.centerLat,
              lng: openPopupMarker.zone.centerLng,
            }}
            onCloseClick={() => setOpenPopupZoneId(null)}
          >
            <div
              dir={locale === "ar" ? "rtl" : "ltr"}
              className={`zone-map-popup${
                locale === "ar" ? " zone-map-popup--rtl" : ""
              }`}
            >
              <p className="zone-map-popup__title">{openPopupMarker.popupTitle}</p>
              <p className="zone-map-popup__line">
                {openPopupMarker.displayZoneName}
              </p>
              <p className="zone-map-popup__line">{openPopupMarker.displayCity}</p>
              <p className="zone-map-popup__line">
                {t("common.score")}: {openPopupMarker.zone.overallScore.toFixed(1)}
              </p>
              <p className="zone-map-popup__line">
                {t(`listing.${openPopupMarker.dominantTypeInfo.type}`)}:{" "}
                {openPopupMarker.dominantTypeInfo.count}
              </p>
              <p className="zone-map-popup__line">
                {purpose === "rent"
                  ? t("listing.rent")
                  : purpose === "buy"
                    ? t("listing.sale")
                    : t("listing.total")}
                : {openPopupMarker.inventory.total}
              </p>
              {typeof openPopupMarker.highlightedPrice === "number" ? (
                <p className="zone-map-popup__line">
                  {openPopupMarker.highlightedPrice.toLocaleString(
                    locale === "ar"
                      ? "ar-MA"
                      : locale === "fr"
                        ? "fr-MA"
                        : "en-MA",
                  )}{" "}
                  DH
                </p>
              ) : null}
              <p className="zone-map-popup__line zone-map-popup__line--accent">
                {t(`tier.${openPopupMarker.tier}`)}
              </p>
            </div>
          </InfoWindowF>
        ) : null}
      </GoogleMap>
    </div>
  );
}
