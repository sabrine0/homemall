import { cookies } from "next/headers";

const SERVER_API_BASE_URL =
  process.env.API_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

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

  const response = await fetch(`${SERVER_API_BASE_URL}${path}`, {
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
