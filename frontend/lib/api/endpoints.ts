/**
 * One function per Express route. Keep the argument names aligned with the
 * query parameters documented in `backend/router/*.js` so the Swagger page at
 * http://localhost:4000/api-docs stays the single source of truth.
 */
import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  Destination,
  DestinationDetail,
  EventItem,
  HeatmapEntry,
  Paginated,
  PersonalRecommendations,
  Profile,
  Review,
  SeasonalRecommendations,
  Tag,
  TrendingDestination,
} from "@/lib/api/types";

type Auth = Pick<ApiFetchOptions, "token" | "signal">;

/* ---------------------------------------------------------------- tags --- */

export async function getTags(): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/tags");
  return data;
}

/* -------------------------------------------------------- destinations --- */

export type DestinationQuery = {
  q?: string;
  /** Tag slugs, comma-separated — e.g. `"pantai,diving"`. */
  tags?: string;
  province_id?: number;
  city_id?: number;
  page?: number;
};

const EMPTY_PAGE: Paginated<Destination> = {
  data: [],
  page: 1,
  total: 0,
  total_pages: 0,
};

export async function searchDestinations(
  query: DestinationQuery = {},
): Promise<Paginated<Destination>> {
  // getDestinations() answers 404 rather than an empty page when nothing
  // matches, so "no results" has to be normalised back into an empty list.
  const page = await apiFetch<Paginated<Destination>>("/api/destinations", {
    query,
    nullOn404: true,
  });
  return page ?? { ...EMPTY_PAGE, page: query.page ?? 1 };
}

export async function getDestination(
  id: string,
): Promise<DestinationDetail | null> {
  const result = await apiFetch<{ data: DestinationDetail }>(
    `/api/destinations/${id}`,
    { nullOn404: true },
  );
  return result?.data ?? null;
}

/**
 * Walks the paginated list until exhausted, so callers can rank across the
 * whole catalogue instead of within one arbitrary page. `/api/destinations`
 * returns 15 rows per page and orders by region, not popularity.
 *
 * Capped so a growing catalogue cannot turn one render into dozens of
 * round-trips — call it from a `"use cache"` scope.
 */
export async function getAllDestinations(maxPages = 5): Promise<Destination[]> {
  const first = await searchDestinations({ page: 1 });
  const pages = Math.min(first.total_pages, maxPages);

  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      searchDestinations({ page: i + 2 }),
    ),
  );

  return [first, ...rest].flatMap((page) => page.data);
}

export type TrendingPeriod = "7d" | "30d" | "all";

export async function getTrendingDestinations(
  period: TrendingPeriod = "7d",
): Promise<TrendingDestination[]> {
  const { data } = await apiFetch<{
    data: TrendingDestination[];
    period: TrendingPeriod;
  }>("/api/destinations/trending", { query: { period } });
  return data;
}

/** Fire-and-forget view counter; deduped server-side for 24h per user/IP. */
export async function trackDestinationView(id: string, auth: Auth = {}) {
  return apiFetch<{ tracked: boolean; message?: string }>(
    `/api/destinations/${id}/view`,
    { method: "POST", ...auth },
  );
}

/* -------------------------------------------------------------- events --- */

export async function getEvents(
  query: { month?: number; province_id?: number; city_id?: number } = {},
): Promise<EventItem[]> {
  const { data } = await apiFetch<{ data: EventItem[] }>("/api/events", {
    query,
  });
  return data;
}

export async function getEvent(id: string): Promise<EventItem | null> {
  const result = await apiFetch<{ data: EventItem }>(`/api/events/${id}`, {
    nullOn404: true,
  });
  return result?.data ?? null;
}

/* ------------------------------------------------------------- heatmap --- */

/** @param period `YYYY-MM`; omitted falls back to the latest period on record. */
export async function getHeatmap(period?: string): Promise<HeatmapEntry[]> {
  const { data } = await apiFetch<{ data: HeatmapEntry[] }>("/api/heatmap", {
    query: { period },
  });
  return data;
}

/* ----------------------------------------------------- recommendations --- */

export async function getSeasonalRecommendations(
  query: { month?: number; province_id?: number } = {},
): Promise<SeasonalRecommendations> {
  return apiFetch<SeasonalRecommendations>("/api/recommendations", { query });
}

export async function getPersonalRecommendations(
  auth: Auth,
): Promise<PersonalRecommendations> {
  return apiFetch<PersonalRecommendations>("/api/recommendations/for-you", auth);
}

/* ------------------------------------------------- profile & preferences --- */

export async function getProfile(auth: Auth): Promise<Profile | null> {
  // getMe() keys the body as `user`, not `data` like every other controller.
  const result = await apiFetch<{ user: Profile }>("/api/auth/me", {
    ...auth,
    nullOn404: true,
  });
  return result?.user ?? null;
}

export async function getPreferences(auth: Auth): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/preferences", auth);
  return data;
}

/** Replaces the whole preference set — this is a PUT, not an append. */
export async function updatePreferences(
  tagIds: string[],
  auth: Auth,
): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/preferences", {
    ...auth,
    method: "PUT",
    body: { tag_ids: tagIds },
  });
  return data;
}

/* ------------------------------------------------------------- reviews --- */

export async function getReviews(
  destinationId: string,
  options: { sort?: "recent" | "likes" } & Auth = {},
): Promise<Review[]> {
  const { sort = "recent", ...auth } = options;
  const { data } = await apiFetch<{ data: Review[] }>(
    `/api/destinations/${destinationId}/reviews`,
    { query: { sort }, ...auth },
  );
  return data;
}

export async function createReview(
  destinationId: string,
  input: { rating: number; comment?: string; photo?: File },
  auth: Auth,
): Promise<Review> {
  // The route runs through multer, so the body must be multipart even when
  // there is no photo attached.
  const form = new FormData();
  form.set("rating", String(input.rating));
  if (input.comment) form.set("comment", input.comment);
  if (input.photo) form.set("photo", input.photo);

  const { data } = await apiFetch<{ data: Review }>(
    `/api/destinations/${destinationId}/reviews`,
    { ...auth, method: "POST", body: form },
  );
  return data;
}

export async function deleteReview(reviewId: string, auth: Auth) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/destinations/reviews/${reviewId}`,
    { ...auth, method: "DELETE" },
  );
}

export async function likeReview(reviewId: string, auth: Auth) {
  return apiFetch<{ liked: boolean }>(
    `/api/destinations/reviews/${reviewId}/like`,
    { ...auth, method: "POST" },
  );
}
