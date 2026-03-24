import Link from "next/link";
import { notFound } from "next/navigation";
import type { ListingOffer, ListingResponse } from "@homemall/shared";
import { PropertyMediaPreview } from "@/components/media/property-media-preview";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { buildGoogleMapsUrl, getListingMediaUrls } from "@/lib/media";
import { serverApi } from "@/lib/server-api";

const fallbackMedia =
  "https://staticmap.openstreetmap.de/staticmap.php?center=33.5731,-7.5898&zoom=10&size=1000x600";
const outlineButtonClassName =
  "inline-flex items-center justify-center rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-55";

const listingPrice = (listing: ListingOffer) =>
  listing.purpose === "rent"
    ? `${formatCurrency(listing.priceMonthly ?? 0)} / month`
    : formatCurrency(listing.priceSale ?? 0);

export default async function ListingDetailsPage({
  params,
}: {
  params: {
    listingId: string;
  };
}) {
  let listing: ListingOffer;

  try {
    const response = await serverApi<ListingResponse>(
      `/api/listings/${params.listingId}`,
    );
    listing = response.listing;
  } catch {
    notFound();
  }

  const media = getListingMediaUrls(listing);
  const mapsUrl = buildGoogleMapsUrl(
    listing.zoneCenterLat,
    listing.zoneCenterLng,
    listing.zoneName && listing.zoneCity
      ? `${listing.zoneName}, ${listing.zoneCity}`
      : listing.zoneName,
  );

  return (
    <main className="mx-auto max-w-[1200px] space-y-5 px-4 py-6 md:px-6">
      <div className="flex flex-wrap gap-2">
        <Link href="/compare" className={outlineButtonClassName}>
          Back to compare
        </Link>
        <Link
          href={`/zones/${listing.zoneId}`}
          className={outlineButtonClassName}
        >
          Open zone
        </Link>
        <Link
          href={`/agents/${listing.sellerId}`}
          className={outlineButtonClassName}
        >
          View seller
        </Link>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className={outlineButtonClassName}
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>

      <section className="rounded-3xl border border-brand-200 bg-white/95 p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-brand-600">
              Listing details
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-brand-900">
              {listing.title}
            </h1>
            <p className="mt-1 text-sm text-brand-700">
              {listing.zoneName || "Zone"}
              {listing.zoneCity ? `, ${listing.zoneCity}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-900">
              {listingPrice(listing)}
            </p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Badge tone={listing.purpose === "rent" ? "success" : "warning"}>
                {listing.purpose === "rent" ? "Rent" : "Buy"}
              </Badge>
              <Badge tone="neutral">{listing.type}</Badge>
              <Badge tone="neutral">{listing.status}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
              Area
            </p>
            <p className="mt-1 text-base font-semibold text-brand-900">
              {listing.areaM2 ? `${listing.areaM2.toFixed(0)} m2` : "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
              Bedrooms
            </p>
            <p className="mt-1 text-base font-semibold text-brand-900">
              {listing.bedrooms ? listing.bedrooms.toFixed(0) : "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-600">
              Bathrooms
            </p>
            <p className="mt-1 text-base font-semibold text-brand-900">
              {listing.bathrooms ? listing.bathrooms.toFixed(0) : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-4">
          <p className="text-sm font-semibold text-brand-900">Description</p>
          <p className="mt-2 text-sm text-brand-800">
            {listing.description?.trim() || "No description provided."}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-brand-200 bg-white/95 p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-brand-900">Media</h2>
        {media.length === 0 ? (
          <p className="mt-2 text-sm text-brand-700">No media available.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {media.map((item, index) => (
              <div
                key={`${item}_${index}`}
                className="overflow-hidden rounded-2xl border border-brand-200"
              >
                <PropertyMediaPreview
                  src={item}
                  alt={`${listing.title} media ${index + 1}`}
                  className="h-64 w-full object-cover"
                  videoClassName="h-64 w-full object-cover"
                  fallbackSrc={fallbackMedia}
                  showControls
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
