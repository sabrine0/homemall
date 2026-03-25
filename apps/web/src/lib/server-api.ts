import { cookies, headers } from "next/headers";

const normalizeBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : "";
};

const configuredServerApiBaseUrl =
  normalizeBaseUrl(process.env.API_SERVER_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

const getServerApiBaseUrl = () => {
  if (configuredServerApiBaseUrl) {
    return configuredServerApiBaseUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000";
  }

  const requestHeaders = headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    throw new Error(
      "Missing API server origin. Set API_SERVER_URL for production deployments.",
    );
  }

  return `${protocol}://${host}`;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
};

export const serverApi = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const cookieHeader = cookies().toString();
  const serverApiBaseUrl = getServerApiBaseUrl();

  const response = await fetch(`${serverApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...(init?.headers || {}),
    },
  });

  return parseResponse<T>(response);
};
