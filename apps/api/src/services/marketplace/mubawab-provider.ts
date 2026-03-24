type ListingPurpose = "rent" | "buy";

interface SearchTarget {
  url: string;
  city: string;
  purpose: ListingPurpose;
}

const SEARCH_TARGETS: SearchTarget[] = [
  {
    url: "https://www.mubawab.ma/en/ct/casablanca/apartments-for-rent",
    city: "Casablanca",
    purpose: "rent"
  },
  {
    url: "https://www.mubawab.ma/en/ct/casablanca/apartments-for-sale",
    city: "Casablanca",
    purpose: "buy"
  },
  {
    url: "https://www.mubawab.ma/en/ct/rabat/apartments-for-rent",
    city: "Rabat",
    purpose: "rent"
  },
  {
    url: "https://www.mubawab.ma/en/ct/marrakech/apartments-for-sale",
    city: "Marrakech",
    purpose: "buy"
  }
];

const CITY_CENTER: Record<string, { lat: number; lng: number }> = {
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  sale: { lat: 34.0372, lng: -6.7985 },
  fes: { lat: 34.0331, lng: -5.0003 },
  meknes: { lat: 33.8731, lng: -5.5407 },
  marrakech: { lat: 31.6295, lng: -7.9811 },
  agadir: { lat: 30.4278, lng: -9.5981 },
  tangier: { lat: 35.7595, lng: -5.834 }
};

const hashNumber = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const parseJsonScriptBlocks = (html: string): unknown[] => {
  const scripts: unknown[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = regex.exec(html);

  while (match) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      scripts.push(parsed);
    } catch {
      // Ignore malformed script block
    }
    match = regex.exec(html);
  }

  return scripts;
};

const toArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
};

const asText = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const extractRowsFromLdJson = (
  data: unknown,
  target: SearchTarget
): Array<Record<string, unknown>> => {
  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;
  const type = asText(record["@type"])?.toLowerCase();

  if (type === "itemlist") {
    const items = toArray(record.itemListElement as unknown[]);
    return items.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const nested = (item as Record<string, unknown>).item;
      if (!nested || typeof nested !== "object") {
        return [];
      }
      return extractRowsFromLdJson(nested, target);
    });
  }

  const url = asText(record.url);
  const title = asText(record.name);
  if (!url || !title) {
    return [];
  }

  const description = asText(record.description);
  const offers = record.offers && typeof record.offers === "object"
    ? (record.offers as Record<string, unknown>)
    : null;
  const priceRaw = asText(offers?.price) ?? asText((offers as { lowPrice?: unknown })?.lowPrice);
  const price = priceRaw ? Number(priceRaw.replace(/[^\d.,-]/g, "").replace(",", ".")) : 0;
  const address = record.address && typeof record.address === "object"
    ? (record.address as Record<string, unknown>)
    : null;
  const city = asText(address?.addressLocality) ?? target.city;
  const neighborhood = asText(address?.streetAddress) ?? title.split("-")[0]?.trim();
  const imageCandidates = toArray(record.image as string | string[]);

  const areaMatch = description?.match(/(\d{2,4})\s*(m2|m²)/i);
  const bedroomsMatch = description?.match(/(\d{1,2})\s*(bed|chambre|room)/i);
  const bathroomsMatch = description?.match(/(\d{1,2})\s*(bath|sdb|bathroom)/i);

  const listingTypeText = `${title} ${description ?? ""} ${url}`.toLowerCase();
  const listingType =
    listingTypeText.includes("villa")
      ? "villa"
      : listingTypeText.includes("studio")
        ? "studio"
        : listingTypeText.includes("land") || listingTypeText.includes("terrain")
          ? "land"
          : listingTypeText.includes("house") || listingTypeText.includes("maison")
            ? "house"
            : "apartment";

  const sourceListingId =
    url.match(/([0-9]{4,})/)?.[1] ??
    `${hashNumber(`${target.city}:${title}:${url}`)}`;

  const center = CITY_CENTER[city.toLowerCase().trim()] ?? CITY_CENTER.casablanca;
  const jitter = (hashNumber(`${city}:${neighborhood ?? title}`) % 8) * 0.0022;

  return [
    {
      name: neighborhood || city,
      city,
      lat: Number((center.lat + jitter).toFixed(5)),
      lng: Number((center.lng - jitter).toFixed(5)),
      title,
      description,
      url,
      sourceListingId,
      imageUrl: imageCandidates[0],
      imageUrls: imageCandidates,
      listingPurpose: target.purpose,
      listingType,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      areaM2: areaMatch ? Number(areaMatch[1]) : undefined,
      bedrooms: bedroomsMatch ? Number(bedroomsMatch[1]) : undefined,
      bathrooms: bathroomsMatch ? Number(bathroomsMatch[1]) : undefined
    }
  ];
};

const fetchTarget = async (target: SearchTarget): Promise<Array<Record<string, unknown>>> => {
  const response = await fetch(target.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      "accept-language": "en;q=0.9,fr;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Mubawab page (${response.status}): ${target.url}`);
  }

  const html = await response.text();
  const scripts = parseJsonScriptBlocks(html);
  const rows = scripts.flatMap((script) => extractRowsFromLdJson(script, target));
  return rows.filter((row) => asText(row.url) && asText(row.title));
};

export const fetchMubawabRows = async (maxRows = 120): Promise<Record<string, unknown>[]> => {
  const rows = (await Promise.all(SEARCH_TARGETS.map((target) => fetchTarget(target)))).flat();
  const deduped = Array.from(
    new Map(rows.map((row) => [`${row.city}|${row.name}|${row.sourceListingId}`, row])).values()
  ).slice(0, maxRows);
  return deduped;
};
