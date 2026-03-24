type ListingPurpose = "rent" | "buy";

interface SearchTarget {
  url: string;
  purpose: ListingPurpose;
}

interface RawAvitoAd {
  id?: string | number;
  listId?: string | number;
  subject?: string;
  href?: string;
  location?: string;
  category?: {
    name?: string;
    formatted?: string;
  };
  adType?: {
    key?: string;
  };
  price?: {
    value?: number;
    currency?: string;
  };
  defaultImage?: string;
  images?: string[];
  params?: {
    secondary?: Array<{
      key?: string;
      value?: string | number;
    }>;
  };
}

interface ImportRow {
  name: string;
  city: string;
  lat: number;
  lng: number;
  title: string;
  url: string;
  sourceListingId: string;
  imageUrl: string;
  imageUrls: string[];
  listingPurpose: ListingPurpose;
  listingType: "apartment" | "house" | "studio" | "villa" | "land";
  price: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
}

const SEARCH_TARGETS: SearchTarget[] = [
  { url: "https://www.avito.ma/fr/maroc/appartements-%C3%A0_vendre", purpose: "buy" },
  { url: "https://www.avito.ma/fr/maroc/appartements-%C3%A0_louer", purpose: "rent" },
  { url: "https://www.avito.ma/fr/maroc/villas-et-maisons-%C3%A0_vendre", purpose: "buy" }
];

const CITY_CENTER: Record<string, { lat: number; lng: number }> = {
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  sale: { lat: 34.0372, lng: -6.7985 },
  fes: { lat: 34.0331, lng: -5.0003 },
  meknes: { lat: 33.8731, lng: -5.5407 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  tangier: { lat: 35.7595, lng: -5.834 },
  tanger: { lat: 35.7595, lng: -5.834 },
  tetouan: { lat: 35.5785, lng: -5.3684 },
  oujda: { lat: 34.6814, lng: -1.9086 },
  kenitra: { lat: 34.261, lng: -6.5802 },
  temara: { lat: 33.9287, lng: -6.9066 },
  "el jadida": { lat: 33.2316, lng: -8.5007 },
  nador: { lat: 35.1688, lng: -2.9335 },
  mohammedia: { lat: 33.6874, lng: -7.382 },
  dakhla: { lat: 23.6848, lng: -15.957 },
  laayoune: { lat: 27.1536, lng: -13.2033 },
  "dar bouazza": { lat: 33.5728, lng: -7.8505 },
  martil: { lat: 35.6166, lng: -5.2752 },
  tifelt: { lat: 33.892, lng: -6.306 }
};

const cityNameFixups: Record<string, string> = {
  tanger: "Tangier",
  tifelt: "Tiflet",
  fes: "Fes",
  sale: "Sale",
  rabat: "Rabat",
  casablanca: "Casablanca",
  marrakech: "Marrakech",
  agadir: "Agadir",
  tetouan: "Tetouan",
  oujda: "Oujda",
  kenitra: "Kenitra",
  mohammedia: "Mohammedia"
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const hashNumber = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const extractNextData = (html: string): Record<string, unknown> | null => {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }

  return JSON.parse(match[1]) as Record<string, unknown>;
};

const getNested = <T = unknown>(input: Record<string, unknown>, path: string[]): T | undefined => {
  let current: unknown = input;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current as T;
};

const parseCity = (location: string | undefined) => {
  const primary = (location ?? "").split(",")[0]?.trim() ?? "";
  const normalized = primary
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const fixed = cityNameFixups[normalized] ?? titleCase(primary || "Casablanca");
  return { raw: primary, normalized, display: fixed };
};

const parseArea = (location: string | undefined) => {
  const parts = (location ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const second = parts[1] ?? "";
  if (!second || /toute la ville/i.test(second)) {
    return "";
  }
  return titleCase(second);
};

const parseListingType = (category: string | undefined): "apartment" | "house" | "studio" | "villa" | "land" => {
  const normalized = (category ?? "").toLowerCase();
  if (normalized.includes("villa")) return "villa";
  if (normalized.includes("studio")) return "studio";
  if (normalized.includes("terrain") || normalized.includes("land")) return "land";
  if (normalized.includes("maison") || normalized.includes("house")) return "house";
  return "apartment";
};

const parsePurpose = (raw: RawAvitoAd, fallback: ListingPurpose): ListingPurpose => {
  const key = (raw.adType?.key ?? "").toUpperCase();
  if (key.includes("RENT")) return "rent";
  if (key.includes("SELL")) return "buy";
  return fallback;
};

const numericParam = (raw: RawAvitoAd, key: string): number | undefined => {
  const params = raw.params?.secondary ?? [];
  const row = params.find((item) => item.key === key);
  if (!row) return undefined;
  if (typeof row.value === "number" && Number.isFinite(row.value)) {
    return row.value;
  }
  if (typeof row.value === "string") {
    const parsed = Number(row.value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const buildRow = (raw: RawAvitoAd, fallbackPurpose: ListingPurpose): ImportRow | null => {
  const href = typeof raw.href === "string" ? raw.href.trim() : "";
  const title = typeof raw.subject === "string" ? raw.subject.trim() : "";
  const imageUrl = typeof raw.defaultImage === "string" ? raw.defaultImage.trim() : "";
  const imageUrls = Array.isArray(raw.images)
    ? raw.images.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const sourceListingId = `${raw.listId ?? raw.id ?? ""}`.trim();
  const price = raw.price?.value;

  if (!href || !title || !imageUrl || !sourceListingId || typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  const location = typeof raw.location === "string" ? raw.location : "";
  const city = parseCity(location);
  const area = parseArea(location);
  const zoneName = area || titleCase(city.display);
  const cityCenter = CITY_CENTER[city.normalized] ?? CITY_CENTER[slugify(city.display).replace(/-/g, " ")] ?? CITY_CENTER.casablanca;
  const jitter = (hashNumber(`${city.display}:${zoneName}`) % 9) * 0.0025;
  const lat = Number((cityCenter.lat + jitter).toFixed(5));
  const lng = Number((cityCenter.lng - jitter).toFixed(5));
  const listingPurpose = parsePurpose(raw, fallbackPurpose);
  const listingType = parseListingType(raw.category?.formatted ?? raw.category?.name);
  const sourceUrl = href.startsWith("http") ? href : `https://www.avito.ma${href}`;
  const dedupedImages = Array.from(new Set([imageUrl, ...imageUrls])).slice(0, 10);

  return {
    name: zoneName,
    city: city.display,
    lat,
    lng,
    title,
    url: sourceUrl,
    sourceListingId,
    imageUrl,
    imageUrls: dedupedImages,
    listingPurpose,
    listingType,
    price,
    areaM2: numericParam(raw, "size"),
    bedrooms: numericParam(raw, "rooms"),
    bathrooms: numericParam(raw, "bathrooms")
  };
};

const fetchAds = async (target: SearchTarget): Promise<ImportRow[]> => {
  const response = await fetch(target.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      "accept-language": "fr-MA,fr;q=0.9,en;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Avito page (${response.status}): ${target.url}`);
  }

  const html = await response.text();
  const nextData = extractNextData(html);
  if (!nextData) {
    throw new Error(`Could not extract NEXT_DATA from: ${target.url}`);
  }

  const ads = getNested<RawAvitoAd[]>(nextData, ["props", "pageProps", "componentProps", "ads", "ads"]) ?? [];
  return ads.map((item) => buildRow(item, target.purpose)).filter((row): row is ImportRow => Boolean(row));
};

export const fetchAvitoRows = async (maxRows = 120): Promise<Record<string, unknown>[]> => {
  const allRows = (await Promise.all(SEARCH_TARGETS.map((target) => fetchAds(target)))).flat();
  const deduped = Array.from(
    new Map(allRows.map((row) => [`${row.city}|${row.name}|${row.sourceListingId}`, row])).values()
  ).slice(0, maxRows);

  return deduped as unknown as Record<string, unknown>[];
};
