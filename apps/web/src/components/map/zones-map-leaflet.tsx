"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { ZoneSummary } from "@homemall/shared";
import L from "leaflet";
import {
  MOROCCO_BOUNDS,
  MOROCCO_CENTER,
  MOROCCO_SOUTH_REGION_MASK_FILL,
  MOROCCO_SOUTH_REGION_MASK_PATH,
} from "./morocco-map-geometry";

type MarkerTier = "best" | "medium" | "worst";

export interface LeafletMarkerModel {
  zone: ZoneSummary;
  tier: MarkerTier;
  selected: boolean;
  inventory: {
    total: number;
  };
  dominantTypeInfo: {
    type: string;
    count: number;
  };
  displayCity: string;
  displayZoneName: string;
  popupTitle: string;
  highlightedPrice?: number;
}

interface ZonesMapLeafletProps {
  markerModels: LeafletMarkerModel[];
  selectedZoneId?: string;
  locale: string;
  purposeLabel: string;
  scoreLabel: string;
  tierLabels: Record<MarkerTier, string>;
  listingTypeLabel: (type: string) => string;
  onSelectZone?: (zone: ZoneSummary) => void;
}

const propertyTypeToBadge: Record<string, string> = {
  house: "H",
  apartment: "A",
  studio: "S",
  villa: "V",
  land: "L",
};

const tierColor = (tier: MarkerTier) => {
  if (tier === "best") return "#1f9d55";
  if (tier === "worst") return "#dc2626";
  return "#f59e0b";
};

function MapViewportController({
  markerModels,
  selectedZoneId,
}: Pick<ZonesMapLeafletProps, "markerModels" | "selectedZoneId">) {
  const map = useMap();
  const moroccoBounds = useMemo(
    () =>
      L.latLngBounds(
        L.latLng(MOROCCO_BOUNDS.south, MOROCCO_BOUNDS.west),
        L.latLng(MOROCCO_BOUNDS.north, MOROCCO_BOUNDS.east),
      ),
    [],
  );

  useEffect(() => {
    const selectedMarker = selectedZoneId
      ? markerModels.find((marker) => marker.zone.id === selectedZoneId)
      : undefined;

    if (selectedMarker) {
      const focusBounds = L.latLngBounds(
        [
          [selectedMarker.zone.centerLat - 0.6, selectedMarker.zone.centerLng - 0.8],
          [selectedMarker.zone.centerLat + 0.6, selectedMarker.zone.centerLng + 0.8],
        ],
      );
      map.fitBounds(focusBounds, { animate: false, padding: [24, 24] });
      map.setZoom(Math.min(map.getZoom(), 10));
      return;
    }

    if (!markerModels.length) {
      map.fitBounds(moroccoBounds, { padding: [24, 24] });
      return;
    }

    if (markerModels.length === 1) {
      map.setView(
        [markerModels[0].zone.centerLat, markerModels[0].zone.centerLng],
        10,
        { animate: false },
      );
      return;
    }

    const bounds = L.latLngBounds(
      markerModels.map((marker) =>
        L.latLng(marker.zone.centerLat, marker.zone.centerLng),
      ),
    );

    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, markerModels, moroccoBounds, selectedZoneId]);

  return null;
}

export function ZonesMapLeaflet({
  markerModels,
  selectedZoneId,
  locale,
  purposeLabel,
  scoreLabel,
  tierLabels,
  listingTypeLabel,
  onSelectZone,
}: ZonesMapLeafletProps) {
  const mapBounds = useMemo(
    () =>
      L.latLngBounds(
        L.latLng(MOROCCO_BOUNDS.south, MOROCCO_BOUNDS.west),
        L.latLng(MOROCCO_BOUNDS.north, MOROCCO_BOUNDS.east),
      ),
    [],
  );
  const southRegionMask = useMemo(
    () =>
      MOROCCO_SOUTH_REGION_MASK_PATH.map(
        ({ lat, lng }) => [lat, lng] as L.LatLngTuple,
      ),
    [],
  );
  return (
    <div className="h-[52vh] min-h-[340px] w-full overflow-hidden rounded-3xl border border-brand-200 bg-[#edf3f0] shadow-panel">
      <MapContainer
        bounds={mapBounds}
        boundsOptions={{ padding: [24, 24] }}
        center={[MOROCCO_CENTER.lat, MOROCCO_CENTER.lng]}
        zoom={6}
        minZoom={6}
        maxBounds={mapBounds}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        zoomSnap={0.25}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap
        />
        <Polygon
          positions={southRegionMask}
          pathOptions={{
            color: MOROCCO_SOUTH_REGION_MASK_FILL,
            weight: 0,
            opacity: 0,
            fillColor: MOROCCO_SOUTH_REGION_MASK_FILL,
            fillOpacity: 0.96,
          }}
          interactive={false}
        />
        <MapViewportController
          markerModels={markerModels}
          selectedZoneId={selectedZoneId}
        />
        {markerModels.map((marker) => {
          const badgeText = `${
            propertyTypeToBadge[marker.dominantTypeInfo.type] ?? "Z"
          } ${marker.inventory.total}`;

          return (
            <CircleMarker
              key={marker.zone.id}
              center={[marker.zone.centerLat, marker.zone.centerLng]}
              radius={marker.selected ? 16 : 12}
              pathOptions={{
                color: "#ffffff",
                weight: marker.selected ? 4 : 3,
                fillColor: tierColor(marker.tier),
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelectZone?.(marker.zone),
              }}
            >
              <Tooltip
                permanent
                direction="center"
                offset={[0, 0]}
                interactive={false}
                className={`zone-marker-count zone-marker-count--${marker.tier}${
                  marker.selected ? " zone-marker-count--selected" : ""
                }`}
              >
                <span>{badgeText}</span>
              </Tooltip>
              <Popup>
                <div
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  className={`zone-map-popup${
                    locale === "ar" ? " zone-map-popup--rtl" : ""
                  }`}
                >
                  <p className="zone-map-popup__title">{marker.popupTitle}</p>
                  <p className="zone-map-popup__line">{marker.displayZoneName}</p>
                  <p className="zone-map-popup__line">{marker.displayCity}</p>
                  <p className="zone-map-popup__line">
                    {scoreLabel}: {marker.zone.overallScore.toFixed(1)}
                  </p>
                  <p className="zone-map-popup__line">
                    {listingTypeLabel(marker.dominantTypeInfo.type)}:{" "}
                    {marker.dominantTypeInfo.count}
                  </p>
                  <p className="zone-map-popup__line">
                    {purposeLabel}: {marker.inventory.total}
                  </p>
                  {typeof marker.highlightedPrice === "number" ? (
                    <p className="zone-map-popup__line">
                      {marker.highlightedPrice.toLocaleString(
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
                    {tierLabels[marker.tier]}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
