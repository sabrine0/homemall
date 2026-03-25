"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CreateListingInput,
  ListingOffer,
  ListingPropertyType,
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

export function ListingsWorkspace({ zones }: ListingsWorkspaceProps) {
  const { t, locale } = useI18n();
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

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === zoneId),
    [zoneId, zones],
  );
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
        selectedZone?.centerLat,
        selectedZone?.centerLng,
        selectedZone ? `${selectedZone.name}, ${selectedZone.city}` : undefined,
        locale,
      ),
    [locale, selectedZone],
  );

  useEffect(
    () => () => {
      selectedMediaPreviews.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    },
    [selectedMediaPreviews],
  );

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
      if (!zoneId) {
        throw new Error("Please choose a zone.");
      }
      if (!title.trim()) {
        throw new Error("Please add a title.");
      }
      if (!selectedFiles.length) {
        throw new Error("Please upload at least one image or video.");
      }

      const basePayload: CreateListingInput = {
        zoneId,
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
                <select
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2"
                  required
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} - {zone.city}
                    </option>
                  ))}
                </select>
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
