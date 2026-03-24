"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  getLikedOffers,
  removeLikedOffer,
  subscribeToLikedOffersChanges,
  type LikedOfferDraft,
} from "@/lib/offer-interactions";

const fallbackImage =
  "https://staticmap.openstreetmap.de/staticmap.php?center=33.5731,-7.5898&zoom=10&size=640x360";

export function LikedOffersPanel() {
  const [offers, setOffers] = useState<LikedOfferDraft[]>([]);

  const load = () => {
    setOffers(getLikedOffers());
  };

  useEffect(() => {
    load();
    return subscribeToLikedOffersChanges(load);
  }, []);

  const sorted = useMemo(
    () => [...offers].sort((a, b) => b.createdAt - a.createdAt),
    [offers],
  );

  return (
    <section
      id="liked-offers"
      className="rounded-2xl border border-brand-200 bg-white/90 p-5"
    >
      <h2 className="text-lg font-semibold text-brand-900">Liked offers</h2>
      <p className="mt-1 text-sm text-brand-700">
        Offers you liked while browsing zones and sellers.
      </p>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-brand-700">
          You have no liked offers yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((offer) => {
            const priceText =
              offer.purpose === "rent"
                ? `${formatCurrency(offer.priceMonthly ?? 0)} / month`
                : formatCurrency(offer.priceSale ?? 0);

            return (
              <article
                key={offer.listingId}
                className="overflow-hidden rounded-2xl border border-brand-200 bg-white"
              >
                <img
                  src={offer.imageUrl || fallbackImage}
                  alt={offer.title}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    if (event.currentTarget.src !== fallbackImage) {
                      event.currentTarget.src = fallbackImage;
                    }
                  }}
                />
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-brand-900">
                    {offer.title}
                  </p>
                  <p className="text-sm text-brand-800">{priceText}</p>
                  <p className="text-xs text-brand-700">
                    {offer.zoneName || "Zone"}
                    {offer.zoneCity ? `, ${offer.zoneCity}` : ""}
                  </p>
                  <p className="text-xs text-brand-700">
                    {offer.areaM2 ? `${offer.areaM2.toFixed(0)} m2` : "m2 n/a"} •{" "}
                    {offer.bedrooms
                      ? `${offer.bedrooms.toFixed(0)} bd`
                      : "bd n/a"}{" "}
                    •{" "}
                    {offer.bathrooms
                      ? `${offer.bathrooms.toFixed(0)} ba`
                      : "ba n/a"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/listings/${offer.listingId}`}
                      className={buttonClassName("outline", "sm")}
                    >
                      Open offer
                    </Link>
                    <Link
                      href={`/zones/${offer.zoneId}`}
                      className={buttonClassName("outline", "sm")}
                    >
                      Open zone
                    </Link>
                    <Link
                      href={`/agents/${offer.sellerId}`}
                      className={buttonClassName("outline", "sm")}
                    >
                      View seller
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        removeLikedOffer(offer.listingId);
                        load();
                      }}
                      className={buttonClassName("ghost", "sm")}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
