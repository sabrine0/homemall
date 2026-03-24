"use client";

import type { ListingOffer } from "@homemall/shared";

export interface CompareOfferDraft {
  listingId: string;
  title: string;
  zoneId: string;
  zoneName?: string;
  purpose: "rent" | "buy";
  housingCostMonthly: number;
  commuteKmMonthly: number;
  energyKwhMonthly: number;
  baselineHealthBudget: number;
  createdAt: number;
}

export interface LikedOfferDraft {
  listingId: string;
  title: string;
  zoneId: string;
  zoneName?: string;
  zoneCity?: string;
  purpose: "rent" | "buy";
  priceMonthly?: number;
  priceSale?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  sellerId: string;
  imageUrl?: string;
  createdAt: number;
}

type CompareAddStatus = "added" | "exists" | "full";

const COMPARE_OFFERS_KEY = "homemall.compare.offers.v1";
const LIKED_OFFERS_KEY = "homemall.liked.offers.v1";
const MAX_COMPARE_OFFERS = 6;
const COMPARE_CHANGED_EVENT = "homemall:compare-changed";
const LIKES_CHANGED_EVENT = "homemall:likes-changed";

const canUseWindow = () => typeof window !== "undefined";

const readJson = <T>(key: string): T | null => {
  if (!canUseWindow()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = <T>(key: string, value: T) => {
  if (!canUseWindow()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota or serialization issues.
  }
};

const emit = (eventName: string) => {
  if (!canUseWindow()) return;
  window.dispatchEvent(new Event(eventName));
};

const sanitizeCompareItem = (item: CompareOfferDraft): CompareOfferDraft => ({
  listingId: item.listingId,
  title: item.title,
  zoneId: item.zoneId,
  zoneName: item.zoneName,
  purpose: item.purpose,
  housingCostMonthly: Math.max(0, Number(item.housingCostMonthly) || 0),
  commuteKmMonthly: Math.max(0, Number(item.commuteKmMonthly) || 0),
  energyKwhMonthly: Math.max(0, Number(item.energyKwhMonthly) || 0),
  baselineHealthBudget: Math.max(0, Number(item.baselineHealthBudget) || 0),
  createdAt: Number(item.createdAt) || Date.now(),
});

const sanitizeLikedItem = (item: LikedOfferDraft): LikedOfferDraft => ({
  listingId: item.listingId,
  title: item.title,
  zoneId: item.zoneId,
  zoneName: item.zoneName,
  zoneCity: item.zoneCity,
  purpose: item.purpose,
  priceMonthly:
    item.priceMonthly === undefined ? undefined : Number(item.priceMonthly) || 0,
  priceSale: item.priceSale === undefined ? undefined : Number(item.priceSale) || 0,
  areaM2: item.areaM2 === undefined ? undefined : Number(item.areaM2) || 0,
  bedrooms:
    item.bedrooms === undefined ? undefined : Number(item.bedrooms) || 0,
  bathrooms:
    item.bathrooms === undefined ? undefined : Number(item.bathrooms) || 0,
  sellerId: item.sellerId,
  imageUrl: item.imageUrl,
  createdAt: Number(item.createdAt) || Date.now(),
});

const estimateHousingCostMonthly = (offer: ListingOffer) => {
  if (offer.purpose === "rent") {
    return Math.max(0, Math.round(offer.priceMonthly ?? 0));
  }

  const salePrice = Math.max(0, Math.round(offer.priceSale ?? 0));
  if (salePrice <= 0) {
    return 1300;
  }

  // Approximate monthly burden from sale value over 20 years.
  return Math.max(500, Math.round(salePrice / 240));
};

const toCompareDraft = (offer: ListingOffer): CompareOfferDraft => ({
  listingId: offer.id,
  title: offer.title,
  zoneId: offer.zoneId,
  zoneName: offer.zoneName,
  purpose: offer.purpose,
  housingCostMonthly: estimateHousingCostMonthly(offer),
  commuteKmMonthly: 380,
  energyKwhMonthly: 260,
  baselineHealthBudget: 80,
  createdAt: Date.now(),
});

const toLikedDraft = (offer: ListingOffer): LikedOfferDraft => ({
  listingId: offer.id,
  title: offer.title,
  zoneId: offer.zoneId,
  zoneName: offer.zoneName,
  zoneCity: offer.zoneCity,
  purpose: offer.purpose,
  priceMonthly: offer.priceMonthly,
  priceSale: offer.priceSale,
  areaM2: offer.areaM2,
  bedrooms: offer.bedrooms,
  bathrooms: offer.bathrooms,
  sellerId: offer.sellerId,
  imageUrl: offer.imageUrl,
  createdAt: Date.now(),
});

export const getCompareOffersCart = (): CompareOfferDraft[] => {
  const raw = readJson<CompareOfferDraft[]>(COMPARE_OFFERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => sanitizeCompareItem(item)).slice(0, MAX_COMPARE_OFFERS);
};

export const isOfferInCompareCart = (listingId: string): boolean =>
  getCompareOffersCart().some((item) => item.listingId === listingId);

export const addOfferToCompareCart = (
  offer: ListingOffer,
): { status: CompareAddStatus; items: CompareOfferDraft[] } => {
  const current = getCompareOffersCart();
  if (current.some((item) => item.listingId === offer.id)) {
    return { status: "exists", items: current };
  }
  if (current.length >= MAX_COMPARE_OFFERS) {
    return { status: "full", items: current };
  }

  const next = [...current, toCompareDraft(offer)].slice(0, MAX_COMPARE_OFFERS);
  writeJson(COMPARE_OFFERS_KEY, next);
  emit(COMPARE_CHANGED_EVENT);
  return { status: "added", items: next };
};

export const removeOfferFromCompareCart = (listingId: string): CompareOfferDraft[] => {
  const next = getCompareOffersCart().filter((item) => item.listingId !== listingId);
  writeJson(COMPARE_OFFERS_KEY, next);
  emit(COMPARE_CHANGED_EVENT);
  return next;
};

export const clearCompareOffersCart = () => {
  writeJson(COMPARE_OFFERS_KEY, []);
  emit(COMPARE_CHANGED_EVENT);
};

export const subscribeToCompareChanges = (callback: () => void) => {
  if (!canUseWindow()) {
    return () => undefined;
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === COMPARE_OFFERS_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(COMPARE_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COMPARE_CHANGED_EVENT, callback);
  };
};

export const getLikedOffers = (): LikedOfferDraft[] => {
  const raw = readJson<LikedOfferDraft[]>(LIKED_OFFERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => sanitizeLikedItem(item));
};

export const isOfferLiked = (listingId: string): boolean =>
  getLikedOffers().some((item) => item.listingId === listingId);

export const toggleLikedOffer = (
  offer: ListingOffer,
): { liked: boolean; items: LikedOfferDraft[] } => {
  const current = getLikedOffers();
  const existingIndex = current.findIndex((item) => item.listingId === offer.id);

  if (existingIndex >= 0) {
    const next = current.filter((item) => item.listingId !== offer.id);
    writeJson(LIKED_OFFERS_KEY, next);
    emit(LIKES_CHANGED_EVENT);
    return { liked: false, items: next };
  }

  const next = [toLikedDraft(offer), ...current];
  writeJson(LIKED_OFFERS_KEY, next);
  emit(LIKES_CHANGED_EVENT);
  return { liked: true, items: next };
};

export const removeLikedOffer = (listingId: string): LikedOfferDraft[] => {
  const next = getLikedOffers().filter((item) => item.listingId !== listingId);
  writeJson(LIKED_OFFERS_KEY, next);
  emit(LIKES_CHANGED_EVENT);
  return next;
};

export const subscribeToLikedOffersChanges = (callback: () => void) => {
  if (!canUseWindow()) {
    return () => undefined;
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIKED_OFFERS_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LIKES_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LIKES_CHANGED_EVENT, callback);
  };
};

export const getMaxCompareOffers = () => MAX_COMPARE_OFFERS;
