const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, "")
  : "";
