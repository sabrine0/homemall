import { API_BASE_URL } from "./config";

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

export const clientApi = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormData
    ? {
        ...(init?.headers || {}),
      }
    : {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  return parseResponse<T>(response);
};
