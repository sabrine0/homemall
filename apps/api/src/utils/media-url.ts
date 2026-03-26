const INTERNAL_MEDIA_HOSTS = new Set(["api", "localhost", "127.0.0.1"]);

export const normalizeMediaUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.pathname.startsWith("/uploads/") &&
      INTERNAL_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

export const normalizeMediaUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeMediaUrl(item))
    .filter((item): item is string => Boolean(item));
};
