"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type {
  CreateListingInput,
  ListingOffer,
  ListingPropertyType,
  ListingZoneDraft,
  ListingPurpose,
  UpdateListingInput,
  UploadListingMediaResponse,
  ZoneSummary,
} from "@homemall/shared";
import { createListingSchema } from "@homemall/shared";
import { useI18n } from "@/components/i18n/i18n-provider";
import { PropertyMediaPreview } from "@/components/media/property-media-preview";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { clientApi } from "@/lib/client-api";
import { formatCurrency } from "@/lib/format";
import { getLocalizedCityName, getLocalizedZoneName } from "@/lib/location-labels";
import { buildGoogleMapsUrl, getListingMediaUrls } from "@/lib/media";

interface ListingsWorkspaceProps {
  zones: ZoneSummary[];
}

interface ListingsResponse {
  listings: ListingOffer[];
}

const listingTypes: ListingPropertyType[] = [
  "apartment",
  "house",
  "studio",
  "villa",
  "land",
];
const maxUploadFiles = 8;
const maxUploadFileSizeBytes = 15 * 1024 * 1024;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const googleMapsRegion = "MA";
const googleMapsPlacesLibraries = ["places"] as ("places")[];
const fallbackMoroccoPlaces: ListingZoneDraft[] = [
  { name: "Casablanca", city: "Casablanca", centerLat: 33.5731, centerLng: -7.5898 },
  { name: "Rabat", city: "Rabat", centerLat: 34.0209, centerLng: -6.8416 },
  { name: "Sale", city: "Sale", centerLat: 34.0372, centerLng: -6.7985 },
  { name: "Marrakech", city: "Marrakech", centerLat: 31.6295, centerLng: -7.9811 },
  { name: "Tangier", city: "Tangier", centerLat: 35.7595, centerLng: -5.834 },
  { name: "Agadir", city: "Agadir", centerLat: 30.4278, centerLng: -9.5981 },
  { name: "Fes", city: "Fes", centerLat: 34.0331, centerLng: -5.0003 },
  { name: "Meknes", city: "Meknes", centerLat: 33.8731, centerLng: -5.5407 },
  { name: "Oujda", city: "Oujda", centerLat: 34.6814, centerLng: -1.9086 },
  { name: "Kenitra", city: "Kenitra", centerLat: 34.261, centerLng: -6.5802 },
  { name: "Temara", city: "Temara", centerLat: 33.9287, centerLng: -6.9066 },
  { name: "El Jadida", city: "El Jadida", centerLat: 33.2316, centerLng: -8.5007 },
  { name: "Mohammedia", city: "Mohammedia", centerLat: 33.6874, centerLng: -7.382 },
  { name: "Tetouan", city: "Tetouan", centerLat: 35.5889, centerLng: -5.3626 },
  { name: "Nador", city: "Nador", centerLat: 35.1688, centerLng: -2.9335 },
  { name: "Beni Mellal", city: "Beni Mellal", centerLat: 32.3373, centerLng: -6.3498 },
  { name: "Ouarzazate", city: "Ouarzazate", centerLat: 30.9335, centerLng: -6.937 },
  { name: "Dakhla", city: "Dakhla", centerLat: 23.6848, centerLng: -15.957 },
  { name: "Laayoune", city: "Laayoune", centerLat: 27.1536, centerLng: -13.2033 },
];

type ZoneSuggestion =
  | {
      kind: "existing";
      key: string;
      label: string;
      detail: string;
      zone: ZoneSummary;
      searchText: string;
    }
  | {
      kind: "google";
      key: string;
      label: string;
      detail: string;
      placeId?: string;
      zoneDraft?: ListingZoneDraft;
      searchText: string;
    };

const parseNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: string): number | undefined => {
  const parsed = parseNumber(value);
  return parsed === undefined ? undefined : Math.round(parsed);
};

const toValidationMessage = (issue: { path: Array<string | number>; message: string }) => {
  const field = typeof issue.path[0] === "string" ? issue.path[0] : "field";
  return `${field}: ${issue.message}`;
};

const purposeLabel = (purpose: ListingPurpose, t: (key: string) => string) =>
  purpose === "rent" ? t("goal.rent") : t("goal.sell");

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getGoogleMapsLanguage = (locale: string) => {
  if (locale === "ar") {
    return "ar";
  }
  if (locale === "fr") {
    return "fr";
  }
  return "en";
};

const formatZoneDraftLabel = (zoneDraft: ListingZoneDraft) =>
  `${zoneDraft.name} - ${zoneDraft.city}`;

const firstAddressComponent = (
  components: Array<{ long_name?: string; types?: string[] }> | undefined,
  types: string[],
) =>
  components?.find((component) =>
    types.some((type) => component.types?.includes(type)),
  )?.long_name;

export function ListingsWorkspace({ zones }: ListingsWorkspaceProps) {
  const { t, locale } = useI18n();
  const zoneListboxId = useId();
  const [mine, setMine] = useState<ListingOffer[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionListingId, setActionListingId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    description: string;
    price: string;
    areaM2: string;
    bedrooms: string;
    bathrooms: string;
    status: ListingOffer["status"];
    contactPhone: string;
    contactEmail: string;
    contactWhatsApp: string;
    contactInstagram: string;
    contactFacebook: string;
    contactWebsite: string;
  }>({
    title: "",
    description: "",
    price: "",
    areaM2: "",
    bedrooms: "",
    bathrooms: "",
    status: "active",
    contactPhone: "",
    contactEmail: "",
    contactWhatsApp: "",
    contactInstagram: "",
    contactFacebook: "",
    contactWebsite: "",
  });

  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [zoneDraft, setZoneDraft] = useState<ListingZoneDraft | null>(null);
  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const [activeZoneSuggestionIndex, setActiveZoneSuggestionIndex] = useState(0);
  const [googleSuggestions, setGoogleSuggestions] = useState<ZoneSuggestion[]>([]);
  const [loadingZoneSuggestions, setLoadingZoneSuggestions] = useState(false);
  const [resolvingZonePlace, setResolvingZonePlace] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<ListingPurpose>("rent");
  const [type, setType] = useState<ListingPropertyType>("apartment");
  const [price, setPrice] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsApp, setContactWhatsApp] = useState("");
  const [contactInstagram, setContactInstagram] = useState("");
  const [contactFacebook, setContactFacebook] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zoneAutocompleteServiceRef = useRef<any>(null);
  const zonePlacesServiceRef = useRef<any>(null);
  const zoneGeocoderRef = useRef<any>(null);
  const zoneBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const googleMapsLanguage = getGoogleMapsLanguage(locale);
  const { isLoaded: isGooglePlacesLoaded } = useJsApiLoader({
    id: `homemall-listing-zone-places-${googleMapsLanguage}`,
    googleMapsApiKey,
    language: googleMapsLanguage,
    region: googleMapsRegion,
    libraries: googleMapsPlacesLibraries,
  });

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === zoneId),
    [zoneId, zones],
  );
  const selectedZoneLabel = useMemo(
    () =>
      selectedZone
        ? `${getLocalizedZoneName(selectedZone.name, selectedZone.city, locale)} - ${getLocalizedCityName(selectedZone.city, locale)}`
        : "",
    [locale, selectedZone],
  );
  const zoneSuggestions = useMemo(() => {
    const query = normalizeSearchText(zoneQuery);
    const zoneMatches = zones
      .map((zone) => {
        const localizedZoneName = getLocalizedZoneName(zone.name, zone.city, locale);
        const localizedCityName = getLocalizedCityName(zone.city, locale);
        const label = `${localizedZoneName} - ${localizedCityName}`;
        const detail = zone.city;

        return {
          kind: "existing" as const,
          key: zone.id,
          label,
          detail,
          zone,
          searchText: normalizeSearchText(`${localizedZoneName} ${localizedCityName} ${zone.name} ${zone.city}`),
        };
      })
      .filter((option) => {
        return query.length === 0 || option.searchText.includes(query);
      })
      .slice(0, 8);

    const seen = new Set(zoneMatches.map((option) => normalizeSearchText(option.label)));
    const googleMatches = googleSuggestions.filter((option) => {
      if (option.kind !== "google") {
        return false;
      }

      const key = normalizeSearchText(option.label);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    const fallbackMatches = fallbackMoroccoPlaces
      .map((place) => ({
        kind: "google" as const,
        key: `fallback-${normalizeSearchText(`${place.name}-${place.city}`)}`,
        label: place.name,
        detail: `${place.city}, Morocco`,
        zoneDraft: place,
        searchText: normalizeSearchText(`${place.name} ${place.city}`),
      }))
      .filter((option) => {
        if (query.length === 0) {
          return false;
        }

        if (!option.searchText.includes(query)) {
          return false;
        }

        const key = normalizeSearchText(option.label);
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

    return [...zoneMatches, ...googleMatches, ...fallbackMatches].slice(0, 8);
  }, [googleSuggestions, locale, zoneQuery, zones]);
  const activeZoneSuggestion =
    zoneSuggestions[activeZoneSuggestionIndex] ?? zoneSuggestions[0];
  const selectedMediaPreviews = useMemo(
    () =>
      selectedFiles.map((file, index) => ({
        id: `${file.name}_${file.lastModified}_${index}`,
        previewUrl: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
        file,
      })),
    [selectedFiles],
  );
  const selectedZoneMapUrl = useMemo(
    () =>
      buildGoogleMapsUrl(
        selectedZone?.centerLat ?? zoneDraft?.centerLat,
        selectedZone?.centerLng ?? zoneDraft?.centerLng,
        selectedZone
          ? `${selectedZone.name}, ${selectedZone.city}`
          : zoneDraft
            ? `${zoneDraft.name}, ${zoneDraft.city}`
            : undefined,
        locale,
      ),
    [locale, selectedZone, zoneDraft],
  );

  useEffect(() => {
    if (!zoneId && zones[0]) {
      setZoneId(zones[0].id);
    }
  }, [zoneId, zones]);

  useEffect(() => {
    if (selectedZoneLabel && !zoneMenuOpen) {
      setZoneQuery(selectedZoneLabel);
      return;
    }

    if (!selectedZone && zoneDraft && !zoneMenuOpen) {
      setZoneQuery(formatZoneDraftLabel(zoneDraft));
    }
  }, [selectedZone, selectedZoneLabel, zoneDraft, zoneMenuOpen]);

  useEffect(() => {
    const googleMaps = (window as { google?: any }).google;
    if (!isGooglePlacesLoaded || !googleMaps?.maps) {
      zoneAutocompleteServiceRef.current = null;
      zonePlacesServiceRef.current = null;
      zoneGeocoderRef.current = null;
      return;
    }

    zoneGeocoderRef.current = new googleMaps.maps.Geocoder();

    if (!googleMaps.maps.places) {
      zoneAutocompleteServiceRef.current = null;
      zonePlacesServiceRef.current = null;
      return;
    }

    zoneAutocompleteServiceRef.current =
      new googleMaps.maps.places.AutocompleteService();
    zonePlacesServiceRef.current = new googleMaps.maps.places.PlacesService(
      document.createElement("div"),
    );
  }, [isGooglePlacesLoaded]);

  useEffect(
    () => () => {
      selectedMediaPreviews.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    },
    [selectedMediaPreviews],
  );

  useEffect(() => {
    return () => {
      if (zoneBlurTimerRef.current) {
        clearTimeout(zoneBlurTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!zoneMenuOpen) {
      return;
    }

    const query = zoneQuery.trim();
    if (
      query.length < 2 ||
      !googleMapsApiKey ||
      (!zoneAutocompleteServiceRef.current && !zoneGeocoderRef.current)
    ) {
      setGoogleSuggestions([]);
      setLoadingZoneSuggestions(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingZoneSuggestions(true);

      const applyGeocoderFallback = () => {
        if (!zoneGeocoderRef.current) {
          setGoogleSuggestions([]);
          setLoadingZoneSuggestions(false);
          return;
        }

        zoneGeocoderRef.current.geocode(
          {
            address: query,
            componentRestrictions: { country: "MA" },
            region: googleMapsRegion,
          },
          (results: any[] | null, status: any) => {
            if (cancelled) {
              return;
            }

            const okStatus =
              (window as { google?: any }).google?.maps?.GeocoderStatus?.OK ?? "OK";
            if (status !== "OK" && status !== okStatus) {
              setGoogleSuggestions([]);
              setLoadingZoneSuggestions(false);
              return;
            }

            setGoogleSuggestions(
              (results ?? []).slice(0, 6).map((result) => {
                const city =
                  firstAddressComponent(result.address_components, [
                    "locality",
                    "administrative_area_level_2",
                    "administrative_area_level_1",
                  ]) ??
                  "Morocco";
                const zoneDraft: ListingZoneDraft = {
                  name: (result.address_components?.[0]?.long_name || result.formatted_address || query).trim().slice(0, 140),
                  city: city.trim().slice(0, 120),
                  centerLat: result.geometry.location.lat(),
                  centerLng: result.geometry.location.lng(),
                  formattedAddress: result.formatted_address?.trim() || undefined,
                  googlePlaceId: result.place_id?.trim() || undefined,
                };

                return {
                  kind: "google" as const,
                  key: result.place_id || result.formatted_address || `${zoneDraft.name}-${zoneDraft.city}`,
                  label: zoneDraft.name,
                  detail: result.formatted_address || `${zoneDraft.city}, Morocco`,
                  placeId: result.place_id || undefined,
                  zoneDraft,
                  searchText: normalizeSearchText(
                    result.formatted_address || `${zoneDraft.name} ${zoneDraft.city}`,
                  ),
                };
              }),
            );
            setLoadingZoneSuggestions(false);
          },
        );
      };

      if (!zoneAutocompleteServiceRef.current) {
        applyGeocoderFallback();
        return;
      }

      zoneAutocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "ma" },
          region: googleMapsRegion,
          language: googleMapsLanguage,
        },
        (predictions: any[] | null, status: any) => {
          if (cancelled) {
            return;
          }

          const okStatus =
            (window as { google?: any }).google?.maps?.places?.PlacesServiceStatus?.OK ?? "OK";
          if (status !== "OK" && status !== okStatus) {
            applyGeocoderFallback();
            return;
          }

          if (!predictions?.length) {
            applyGeocoderFallback();
            return;
          }

          setGoogleSuggestions(
            predictions.map((prediction) => ({
              kind: "google" as const,
              key: prediction.place_id,
              label:
                prediction.structured_formatting?.main_text ??
                prediction.description,
              detail:
                prediction.structured_formatting?.secondary_text ??
                prediction.description,
              placeId: prediction.place_id,
              searchText: normalizeSearchText(
                prediction.description ?? prediction.structured_formatting?.main_text ?? "",
              ),
            })),
          );
          setLoadingZoneSuggestions(false);
        },
      );
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [googleMapsLanguage, zoneMenuOpen, zoneQuery]);

  useEffect(() => {
    setActiveZoneSuggestionIndex(0);
  }, [zoneSuggestions.length, zoneQuery]);

  const selectExistingZone = (zone: ZoneSummary) => {
    const label = `${getLocalizedZoneName(zone.name, zone.city, locale)} - ${getLocalizedCityName(zone.city, locale)}`;
    setZoneId(zone.id);
    setZoneDraft(null);
    setZoneQuery(label);
    setZoneMenuOpen(false);
    setFeedback(null);
  };

  const resolveGoogleZoneDraft = async (suggestion: Extract<ZoneSuggestion, { kind: "google" }>) => {
    if (suggestion.zoneDraft) {
      const matchingZone = zones.find(
        (zone) =>
          normalizeSearchText(zone.name) === normalizeSearchText(suggestion.zoneDraft!.name) &&
          normalizeSearchText(zone.city) === normalizeSearchText(suggestion.zoneDraft!.city),
      );

      if (matchingZone) {
        selectExistingZone(matchingZone);
        return;
      }

      setZoneId("");
      setZoneDraft(suggestion.zoneDraft);
      setZoneQuery(formatZoneDraftLabel(suggestion.zoneDraft));
      setZoneMenuOpen(false);
      setFeedback(null);
      return;
    }

    if (!zonePlacesServiceRef.current) {
      setFeedback("Google location search is not ready yet.");
      return;
    }

    setResolvingZonePlace(true);
    try {
      const place = await new Promise<any>((resolve, reject) => {
        zonePlacesServiceRef.current.getDetails(
          {
            placeId: suggestion.placeId,
            fields: [
              "address_components",
              "formatted_address",
              "geometry",
              "name",
              "place_id",
            ],
          },
          (result: any, status: any) => {
            if (
              status !== "OK" &&
              status !== (window as { google?: any }).google?.maps?.places?.PlacesServiceStatus?.OK
            ) {
              reject(new Error("Could not load that location."));
              return;
            }

            if (!result?.geometry?.location) {
              reject(new Error("That location does not include map coordinates."));
              return;
            }

            resolve(result);
          },
        );
      });

      const city =
        firstAddressComponent(place.address_components, [
          "locality",
          "administrative_area_level_2",
          "administrative_area_level_1",
        ]) ??
        suggestion.detail.split(",")[0]?.trim() ??
        "Morocco";
      const nextZoneDraft: ListingZoneDraft = {
        name: (place.name?.trim() || suggestion.label.trim()).slice(0, 140),
        city: city.slice(0, 120),
        centerLat: place.geometry.location.lat(),
        centerLng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address?.trim() || undefined,
        googlePlaceId: place.place_id?.trim() || undefined,
      };
      const matchingZone = zones.find(
        (zone) =>
          normalizeSearchText(zone.name) === normalizeSearchText(nextZoneDraft.name) &&
          normalizeSearchText(zone.city) === normalizeSearchText(nextZoneDraft.city),
      );

      if (matchingZone) {
        selectExistingZone(matchingZone);
        return;
      }

      setZoneId("");
      setZoneDraft(nextZoneDraft);
      setZoneQuery(formatZoneDraftLabel(nextZoneDraft));
      setZoneMenuOpen(false);
      setFeedback(null);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not use that Google location.",
      );
    } finally {
      setResolvingZonePlace(false);
    }
  };

  const handleZoneSuggestionSelect = async (suggestion: ZoneSuggestion) => {
    if (suggestion.kind === "existing") {
      selectExistingZone(suggestion.zone);
      return;
    }

    await resolveGoogleZoneDraft(suggestion);
  };

  const resolveTypedZoneSelection = () => {
    const query = normalizeSearchText(zoneQuery);
    if (!query) {
      return { zoneId: "", zoneDraft: null as ListingZoneDraft | null };
    }

    const exactZone = zones.find((zone) => {
      const localizedZoneName = getLocalizedZoneName(zone.name, zone.city, locale);
      const localizedCityName = getLocalizedCityName(zone.city, locale);
      return [
        normalizeSearchText(zone.name),
        normalizeSearchText(zone.city),
        normalizeSearchText(localizedZoneName),
        normalizeSearchText(localizedCityName),
        normalizeSearchText(`${localizedZoneName} - ${localizedCityName}`),
      ].includes(query);
    });

    if (exactZone) {
      return { zoneId: exactZone.id, zoneDraft: null as ListingZoneDraft | null };
    }

    const fallbackPlace = fallbackMoroccoPlaces.find((place) =>
      [
        normalizeSearchText(place.name),
        normalizeSearchText(place.city),
        normalizeSearchText(`${place.name} - ${place.city}`),
      ].includes(query),
    );

    if (fallbackPlace) {
      return {
        zoneId: "",
        zoneDraft: fallbackPlace,
      };
    }

    return { zoneId: "", zoneDraft: null as ListingZoneDraft | null };
  };

  const loadMine = async () => {
    setLoadingMine(true);
    try {
      const response = await clientApi<ListingsResponse>("/api/listings/mine");
      setMine(response.listings);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not load your listings.",
      );
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    void loadMine();
  }, []);

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const pickedFiles = Array.from(event.target.files ?? []);
    if (!pickedFiles.length) {
      return;
    }

    const allowedFiles = pickedFiles.filter(
      (file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (allowedFiles.length !== pickedFiles.length) {
      setFeedback("Only image and video files are allowed.");
    } else {
      setFeedback(null);
    }

    const oversizedFile = allowedFiles.find(
      (file) => file.size > maxUploadFileSizeBytes,
    );
    if (oversizedFile) {
      setFeedback("Each upload must be 15 MB or smaller.");
      event.target.value = "";
      return;
    }

    setSelectedFiles((previous) => {
      const remainingSlots = Math.max(maxUploadFiles - previous.length, 0);
      const nextFiles = allowedFiles.slice(0, remainingSlots);

      if (allowedFiles.length > remainingSlots) {
        setFeedback(`You can upload up to ${maxUploadFiles} files.`);
      }

      return [...previous, ...nextFiles];
    });

    event.target.value = "";
  };

  const removeSelectedFile = (targetIndex: number) => {
    setSelectedFiles((previous) =>
      previous.filter((_, index) => index !== targetIndex),
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      let resolvedZoneId = zoneId;
      let resolvedZoneDraft = zoneDraft;

      if (!resolvedZoneId && !resolvedZoneDraft) {
        const inferred = resolveTypedZoneSelection();
        resolvedZoneId = inferred.zoneId;
        resolvedZoneDraft = inferred.zoneDraft;
      }

      if (!resolvedZoneId && !resolvedZoneDraft) {
        throw new Error("Please choose a zone or Google location.");
      }
      if (!title.trim()) {
        throw new Error("Please add a title.");
      }
      if (!selectedFiles.length) {
        throw new Error("Please upload at least one image or video.");
      }

      const basePayload: CreateListingInput = {
        zoneId: resolvedZoneId || undefined,
        zoneDraft: resolvedZoneDraft ?? undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        purpose,
        type,
        imageUrls: selectedFiles.map(
          (_, index) => `https://upload.local/${Date.now()}-${index}`,
        ),
        priceMonthly: purpose === "rent" ? parseNumber(price) : undefined,
        priceSale: purpose === "buy" ? parseNumber(price) : undefined,
        areaM2: parseNumber(areaM2),
        bedrooms: parseInteger(bedrooms),
        bathrooms: parseInteger(bathrooms),
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactWhatsApp: contactWhatsApp.trim() || undefined,
        contactInstagram: contactInstagram.trim() || undefined,
        contactFacebook: contactFacebook.trim() || undefined,
        contactWebsite: contactWebsite.trim() || undefined,
      };

      const preflight = createListingSchema.safeParse(basePayload);
      if (!preflight.success) {
        const firstIssue = preflight.error.issues[0];
        throw new Error(
          firstIssue ? toValidationMessage(firstIssue) : "Invalid listing data.",
        );
      }

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const uploadResponse = await clientApi<UploadListingMediaResponse>(
        "/api/listings/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const payload: CreateListingInput = {
        ...basePayload,
        imageUrls: uploadResponse.files.map((file) => file.url),
      };

      await clientApi<{ listing: ListingOffer }>("/api/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFeedback("Listing posted successfully.");
      setZoneDraft(null);
      setTitle("");
      setDescription("");
      setPrice("");
      setAreaM2("");
      setBedrooms("");
      setBathrooms("");
      setContactPhone("");
      setContactEmail("");
      setContactWhatsApp("");
      setContactInstagram("");
      setContactFacebook("");
      setContactWebsite("");
      clearSelectedFiles();
      await loadMine();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not create listing.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (listing: ListingOffer) => {
    setEditingListingId(listing.id);
    setEditDraft({
      title: listing.title,
      description: listing.description ?? "",
      price: String(
        listing.purpose === "rent"
          ? listing.priceMonthly ?? ""
          : listing.priceSale ?? "",
      ),
      areaM2: listing.areaM2 === undefined ? "" : String(listing.areaM2),
      bedrooms: listing.bedrooms === undefined ? "" : String(listing.bedrooms),
      bathrooms:
        listing.bathrooms === undefined ? "" : String(listing.bathrooms),
      status: listing.status,
      contactPhone: listing.contactPhone ?? "",
      contactEmail: listing.contactEmail ?? "",
      contactWhatsApp: listing.contactWhatsApp ?? "",
      contactInstagram: listing.contactInstagram ?? "",
      contactFacebook: listing.contactFacebook ?? "",
      contactWebsite: listing.contactWebsite ?? "",
    });
    setFeedback(null);
  };

  const saveEdit = async (listing: ListingOffer) => {
    const trimmedTitle = editDraft.title.trim();
    if (trimmedTitle.length < 3) {
      setFeedback("Title must have at least 3 characters.");
      return;
    }

    setActionListingId(listing.id);
    setFeedback(null);
    try {
      const payload: UpdateListingInput = {
        title: trimmedTitle,
        description: editDraft.description.trim() || undefined,
        areaM2: parseNumber(editDraft.areaM2),
        bedrooms: parseInteger(editDraft.bedrooms),
        bathrooms: parseInteger(editDraft.bathrooms),
        status: editDraft.status,
        contactPhone: editDraft.contactPhone.trim() || undefined,
        contactEmail: editDraft.contactEmail.trim() || undefined,
        contactWhatsApp: editDraft.contactWhatsApp.trim() || undefined,
        contactInstagram: editDraft.contactInstagram.trim() || undefined,
        contactFacebook: editDraft.contactFacebook.trim() || undefined,
        contactWebsite: editDraft.contactWebsite.trim() || undefined,
      };

      const parsedPrice = parseNumber(editDraft.price);
      if (listing.purpose === "rent") {
        payload.priceMonthly = parsedPrice;
      } else {
        payload.priceSale = parsedPrice;
      }

      await clientApi<{ listing: ListingOffer }>(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditingListingId(null);
      setFeedback("Listing updated.");
      await loadMine();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not update listing.",
      );
    } finally {
      setActionListingId(null);
    }
  };

  const changeStatus = async (
    listing: ListingOffer,
    status: ListingOffer["status"],
  ) => {
    setActionListingId(listing.id);
    setFeedback(null);
    try {
      await clientApi<{ listing: ListingOffer }>(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setFeedback(`Listing status changed to ${status}.`);
      await loadMine();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not change listing status.",
      );
    } finally {
      setActionListingId(null);
    }
  };

  const deleteListing = async (listing: ListingOffer) => {
    const confirmed = window.confirm(
      "Delete this listing? This action cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setActionListingId(listing.id);
    setFeedback(null);
    try {
      await clientApi<null>(`/api/listings/${listing.id}`, {
        method: "DELETE",
      });
      setFeedback("Listing deleted.");
      if (editingListingId === listing.id) {
        setEditingListingId(null);
      }
      await loadMine();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Could not delete listing.",
      );
    } finally {
      setActionListingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 md:px-6">
      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-600">
              {t("nav.listings")}
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl text-brand-900">
              {t("listings.title")}
            </h1>
            <p className="mt-1 text-sm text-brand-700">
              {t("listings.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mine[0]?.sellerId ? (
              <Link
                href={`/agents/${mine[0].sellerId}`}
                className={buttonClassName("outline", "md")}
              >
                {t("action.viewSeller")}
              </Link>
            ) : null}
            <Link href="/messages" className={buttonClassName("outline", "md")}>
              {t("action.openMessages")}
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl">
          <CardTitle>{t("action.postListing")}</CardTitle>
          <form className="mt-3 space-y-3" onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-800">
                Zone
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={zoneQuery}
                    onFocus={() => setZoneMenuOpen(true)}
                    onBlur={() => {
                      zoneBlurTimerRef.current = setTimeout(() => {
                        setZoneMenuOpen(false);
                      }, 120);
                    }}
                    onChange={(event) => {
                      setZoneQuery(event.target.value);
                      setZoneId("");
                      setZoneDraft(null);
                      setZoneMenuOpen(true);
                      setFeedback(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setZoneMenuOpen(true);
                        setActiveZoneSuggestionIndex((current) =>
                          zoneSuggestions.length
                            ? Math.min(current + 1, zoneSuggestions.length - 1)
                            : 0,
                        );
                        return;
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveZoneSuggestionIndex((current) =>
                          Math.max(current - 1, 0),
                        );
                        return;
                      }

                      if (event.key === "Enter" && zoneMenuOpen && activeZoneSuggestion) {
                        event.preventDefault();
                        void handleZoneSuggestionSelect(activeZoneSuggestion);
                        return;
                      }

                      if (event.key === "Escape") {
                        setZoneMenuOpen(false);
                      }
                    }}
                    placeholder="Start typing a zone, city, or Google Maps place"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={zoneMenuOpen}
                    aria-controls={zoneListboxId}
                    aria-activedescendant={
                      zoneMenuOpen && activeZoneSuggestion
                        ? `${zoneListboxId}-${activeZoneSuggestion.key}`
                        : undefined
                    }
                    className="w-full rounded-xl border border-brand-200 px-3 py-2 outline-none ring-brand-300 focus:ring"
                    required
                  />
                  {zoneMenuOpen ? (
                    <div
                      id={zoneListboxId}
                      role="listbox"
                      className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-brand-200 bg-white p-2 shadow-panel"
                    >
                      {zoneSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.key}
                          id={`${zoneListboxId}-${suggestion.key}`}
                          type="button"
                          role="option"
                          aria-selected={activeZoneSuggestionIndex === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            void handleZoneSuggestionSelect(suggestion);
                          }}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left ${
                            activeZoneSuggestionIndex === index
                              ? "bg-brand-50 text-brand-900"
                              : "text-brand-800 hover:bg-brand-50"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold">
                              {suggestion.label}
                            </span>
                            <span className="block text-xs text-brand-600">
                              {suggestion.kind === "google"
                                ? `${suggestion.detail} • Google Maps`
                                : suggestion.detail}
                            </span>
                          </span>
                          <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                            {suggestion.kind === "google" ? "Google" : "Zone"}
                          </span>
                        </button>
                      ))}
                      {!zoneSuggestions.length ? (
                        <p className="px-3 py-2 text-sm text-brand-600">
                          {loadingZoneSuggestions
                            ? "Searching Google Maps..."
                            : "No zone or Google Maps match found."}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <span className="mt-2 block text-xs text-brand-600">
                  {zoneDraft
                    ? "Google place selected. A zone will be created automatically when you post the listing."
                    : resolvingZonePlace
                      ? "Loading Google Maps place details..."
                      : "Type to filter zones or pick a Google Maps place in Morocco."}
                </span>
                {selectedZoneMapUrl ? (
                  <a
                    href={selectedZoneMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-brand-700 underline"
                  >
                    {t("action.openGoogleMaps")}
                  </a>
                ) : null}
              </label>

              <label className="text-sm text-brand-800">
                Type
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as ListingPropertyType)
                  }
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                >
                  {listingTypes.map((item) => (
                    <option key={item} value={item}>
                      {t(`listing.${item}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-800">
                Purpose
                <select
                  value={purpose}
                  onChange={(event) =>
                    setPurpose(event.target.value as ListingPurpose)
                  }
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                >
                  <option value="rent">{t("goal.rent")}</option>
                  <option value="buy">{t("goal.sell")}</option>
                </select>
              </label>

              <label className="text-sm text-brand-800">
                Price (DH)
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  required
                />
              </label>
            </div>

            <label className="block text-sm text-brand-800">
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder={
                  selectedZone
                    ? `${selectedZone.name} • ${purposeLabel(purpose, t)}`
                    : "Listing title"
                }
                required
              />
            </label>

            <label className="block text-sm text-brand-800">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-[100px] w-full rounded-xl border border-brand-200 px-3 py-2"
                placeholder="Add details: condition, floor, parking, neighborhood benefits..."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm text-brand-800">
                Area (m²)
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={areaM2}
                  onChange={(event) => setAreaM2(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="text-sm text-brand-800">
                Bedrooms
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={bedrooms}
                  onChange={(event) => setBedrooms(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="text-sm text-brand-800">
                Bathrooms
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={bathrooms}
                  onChange={(event) => setBathrooms(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="text-sm text-brand-800">
                Phone (optional)
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-800">
                Email (optional)
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
              <label className="text-sm text-brand-800">
                WhatsApp (optional)
                <input
                  type="text"
                  value={contactWhatsApp}
                  onChange={(event) => setContactWhatsApp(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  placeholder="+212600000000"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-brand-800">
                Instagram (optional)
                <input
                  type="text"
                  value={contactInstagram}
                  onChange={(event) => setContactInstagram(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  placeholder="@yourhandle or full URL"
                />
              </label>
              <label className="text-sm text-brand-800">
                Facebook (optional)
                <input
                  type="text"
                  value={contactFacebook}
                  onChange={(event) => setContactFacebook(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  placeholder="page name or full URL"
                />
              </label>
              <label className="text-sm text-brand-800">
                Website (optional)
                <input
                  type="url"
                  value={contactWebsite}
                  onChange={(event) => setContactWebsite(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              </label>
            </div>

            <label className="block text-sm text-brand-800">
              {t("listings.mediaUpload")}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelection}
                className="mt-1 block w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-brand-600">
                {t("listings.mediaUploadHelp")}
              </span>
            </label>

            {selectedMediaPreviews.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedMediaPreviews.map((media, index) => (
                  <div
                    key={media.id}
                    className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-50"
                  >
                    <PropertyMediaPreview
                      src={media.previewUrl}
                      alt={`Media preview ${index + 1}`}
                      className="h-32 w-full object-cover"
                      videoClassName="h-32 w-full object-cover"
                      showControls
                      forceKind={media.isVideo ? "video" : "image"}
                    />
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <p className="truncate text-xs text-brand-700">
                        {media.file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="text-xs font-semibold text-brand-700 underline"
                      >
                        {t("action.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("onboarding.saving") : t("action.postListing")}
              </Button>
              {feedback ? (
                <p className="text-sm text-brand-700">{feedback}</p>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="rounded-3xl">
          <CardTitle>{t("listings.myListings")}</CardTitle>
          <CardDescription className="mt-1">
            {t("messages.subtitle")}
          </CardDescription>

          <div className="mt-3 space-y-3">
            {loadingMine ? (
              <p className="text-sm text-brand-700">{t("common.loading")}</p>
            ) : mine.length === 0 ? (
              <p className="text-sm text-brand-700">{t("listings.none")}</p>
            ) : (
              mine.map((listing) => {
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
                    className="overflow-hidden rounded-2xl border border-brand-200 bg-white"
                  >
                    {media ? (
                      <PropertyMediaPreview
                        src={media}
                        alt={listing.title}
                        className="h-28 w-full object-cover"
                        videoClassName="h-28 w-full object-cover"
                      />
                    ) : null}
                    <div className="space-y-2 p-3">
                      <p className="text-sm font-semibold text-brand-900">
                        {listing.title}
                      </p>
                      <p className="text-xs text-brand-700">
                        {purposeLabel(listing.purpose, t)} • {listing.status}
                      </p>
                      <p className="text-sm text-brand-800">
                        {listing.purpose === "rent"
                          ? `${formatCurrency(listing.priceMonthly ?? 0)} / ${t("common.month")}`
                          : formatCurrency(listing.priceSale ?? 0)}
                      </p>
                      <p className="text-xs text-brand-700">
                        {listing.areaM2
                          ? `${listing.areaM2.toFixed(0)} m²`
                          : "m² n/a"}{" "}
                        •{" "}
                        {listing.bedrooms
                          ? `${listing.bedrooms.toFixed(0)} bd`
                          : "bd n/a"}{" "}
                        •{" "}
                        {listing.bathrooms
                          ? `${listing.bathrooms.toFixed(0)} ba`
                          : "ba n/a"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionListingId === listing.id}
                          onClick={() => startEdit(listing)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionListingId === listing.id}
                          onClick={() =>
                            changeStatus(
                              listing,
                              listing.status === "active" ? "paused" : "active",
                            )
                          }
                        >
                          {listing.status === "active" ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            actionListingId === listing.id ||
                            listing.status === "closed"
                          }
                          onClick={() => changeStatus(listing, "closed")}
                        >
                          Close
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={actionListingId === listing.id}
                          onClick={() => deleteListing(listing)}
                        >
                          Delete
                        </Button>
                        <Link
                          href={`/agents/${listing.sellerId}`}
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
                      {editingListingId === listing.id ? (
                        <div className="mt-2 space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
                          <label className="block text-xs text-brand-800">
                            Title
                            <input
                              type="text"
                              value={editDraft.title}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  title: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                            />
                          </label>
                          <label className="block text-xs text-brand-800">
                            Description
                            <textarea
                              value={editDraft.description}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              className="mt-1 min-h-[70px] w-full rounded-lg border border-brand-200 px-2 py-1.5"
                            />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-xs text-brand-800">
                              Price
                              <input
                                type="number"
                                min={0}
                                step="100"
                                value={editDraft.price}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    price: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Status
                              <select
                                value={editDraft.status}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    status: event.target.value as ListingOffer["status"],
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              >
                                <option value="active">active</option>
                                <option value="paused">paused</option>
                                <option value="closed">closed</option>
                              </select>
                            </label>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="text-xs text-brand-800">
                              Area m²
                              <input
                                type="number"
                                value={editDraft.areaM2}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    areaM2: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Bedrooms
                              <input
                                type="number"
                                value={editDraft.bedrooms}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    bedrooms: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Bathrooms
                              <input
                                type="number"
                                value={editDraft.bathrooms}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    bathrooms: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-xs text-brand-800">
                              Phone
                              <input
                                type="text"
                                value={editDraft.contactPhone}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    contactPhone: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Email
                              <input
                                type="email"
                                value={editDraft.contactEmail}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    contactEmail: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="text-xs text-brand-800">
                              WhatsApp
                              <input
                                type="text"
                                value={editDraft.contactWhatsApp}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    contactWhatsApp: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Instagram
                              <input
                                type="text"
                                value={editDraft.contactInstagram}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    contactInstagram: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                            <label className="text-xs text-brand-800">
                              Facebook
                              <input
                                type="text"
                                value={editDraft.contactFacebook}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    contactFacebook: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                              />
                            </label>
                          </div>
                          <label className="block text-xs text-brand-800">
                            Website
                            <input
                              type="url"
                              value={editDraft.contactWebsite}
                              onChange={(event) =>
                                setEditDraft((prev) => ({
                                  ...prev,
                                  contactWebsite: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-brand-200 px-2 py-1.5"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionListingId === listing.id}
                              onClick={() => saveEdit(listing)}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingListingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
