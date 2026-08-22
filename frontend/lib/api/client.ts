/**
 * Thin fetch wrapper around the Express API in `backend/`.
 *
 * Auth bridge: the backend validates the *Supabase* access token
 * (`backend/middleware/AuthMiddleware.js` calls `supabase.auth.getUser(token)`),
 * and the frontend already holds a Supabase session in cookies. So an
 * authenticated call is just the session's access token forwarded as a
 * `Authorization: Bearer` header — no second login, no separate token format.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

export type ApiFetchOptions = {
  query?: Record<string, QueryValue>;
  /** Supabase access token, for routes behind `authMiddleware`. */
  token?: string | null;
  /** Resolve to `null` instead of throwing when the API answers 404. */
  nullOn404?: boolean;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions & { nullOn404: true },
): Promise<T | null>;
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T>;
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T | null> {
  const { query, token, nullOn404, method = "GET", body, signal } = options;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      signal,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    // Connection refused / DNS / abort — the API is unreachable rather than
    // unhappy, so it never produced a status code.
    throw new ApiError(
      0,
      "network_error",
      `Tidak dapat menghubungi API di ${API_BASE_URL}`,
      path,
    );
  }

  if (response.status === 404 && nullOn404) return null;

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      (payload as { error?: string } | null)?.error ?? "http_error",
      (payload as { message?: string } | null)?.message ??
        `${method} ${path} gagal dengan status ${response.status}`,
      path,
    );
  }

  return (await response.json()) as T;
}
