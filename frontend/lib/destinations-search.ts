/**
 * URL state for the destination catalogue at `/destinations`.
 *
 * The whole listing is driven by the query string — every filter is a plain
 * link, so the page stays server-rendered, shareable, and back-button
 * friendly. `GET /api/destinations` only understands `q`, `tags`,
 * `province_id`, `city_id` and `page`; the rest (rating floor, sorting, view
 * mode) is applied here over the fetched result set.
 */
import type { Destination } from "@/lib/api";

/** Cards per page. Deliberately not the API's 15 — this grid wants 12. */
export const PAGE_SIZE = 12;

export const SORTS = [
  { key: "relevan" },
  { key: "rating" },
  { key: "populer" },
  { key: "nama" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

const SORT_KEYS = SORTS.map((sort) => sort.key) as readonly SortKey[];

/** Rating floors offered in the sidebar, high to low. */
export const RATING_STEPS = [4.5, 4, 3.5, 3] as const;

export type ViewMode = "list" | "grid";

export type SearchState = {
  q: string;
  /** Tag slugs; sent to the API comma-separated, as the controller splits on `,`. */
  tags: string[];
  provinceId: number | null;
  /** 0 means "any rating". Unrated destinations drop out above 0. */
  minRating: number;
  sort: SortKey;
  view: ViewMode;
  page: number;
};

export const DEFAULT_STATE: SearchState = {
  q: "",
  tags: [],
  provinceId: null,
  minRating: 0,
  sort: "relevan",
  view: "list",
  page: 1,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Accepts both `?tags=a,b` and a repeated `?tags=a&tags=b`. */
function parseTags(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : [value ?? ""];
  const slugs = raw
    .flatMap((entry) => (entry ?? "").split(","))
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(slugs)];
}

export function parseSearch(params: RawSearchParams): SearchState {
  const sort = firstValue(params.sort) as SortKey;
  const view = firstValue(params.view);
  const provinceId = Number(firstValue(params.province_id));
  const minRating = Number(firstValue(params.rating));
  const page = Number(firstValue(params.page));

  return {
    q: firstValue(params.q),
    tags: parseTags(params.tags),
    provinceId: Number.isFinite(provinceId) && provinceId > 0 ? provinceId : null,
    minRating: Number.isFinite(minRating) && minRating > 0 ? minRating : 0,
    sort: SORT_KEYS.includes(sort) ? sort : DEFAULT_STATE.sort,
    view: view === "grid" ? "grid" : "list",
    page: Number.isFinite(page) && page > 1 ? Math.floor(page) : 1,
  };
}

/**
 * `/destinations?…` for a state, omitting anything left at its default so the
 * canonical URL of an unfiltered catalogue stays clean.
 */
export function toHref(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.tags.length) params.set("tags", state.tags.join(","));
  if (state.provinceId !== null) params.set("province_id", String(state.provinceId));
  if (state.minRating > 0) params.set("rating", String(state.minRating));
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.view !== DEFAULT_STATE.view) params.set("view", state.view);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  return query ? `/destinations?${query}` : "/destinations";
}

/**
 * Href for a state with `patch` applied. Any change other than paging or the
 * view mode sends the reader back to page 1 — page 7 of the old result set is
 * meaningless once the filters move.
 */
export function withFilter(
  state: SearchState,
  patch: Partial<SearchState>,
): string {
  const keepsPage = "page" in patch || Object.keys(patch).every((key) => key === "view");
  return toHref({ ...state, ...patch, page: keepsPage ? (patch.page ?? state.page) : 1 });
}

/** Href with one tag slug toggled on or off. */
export function withTagToggled(state: SearchState, slug: string): string {
  const tags = state.tags.includes(slug)
    ? state.tags.filter((entry) => entry !== slug)
    : [...state.tags, slug];
  return withFilter(state, { tags });
}

export function hasFilters(state: SearchState): boolean {
  return (
    state.q !== "" ||
    state.tags.length > 0 ||
    state.provinceId !== null ||
    state.minRating > 0
  );
}

/* ------------------------------------------------------- result shaping --- */

/**
 * Rating floor. `avg_rating` is null until a destination has its first review,
 * and an unrated place cannot honestly clear a "4,0 ke atas" filter.
 */
export function applyRatingFloor(items: Destination[], minRating: number) {
  if (minRating <= 0) return items;
  return items.filter((item) => (item.avg_rating ?? 0) >= minRating);
}

export function applyProvince(items: Destination[], provinceId: number | null) {
  if (provinceId === null) return items;
  return items.filter((item) => item.provinces?.id === provinceId);
}

const collator = new Intl.Collator("id-ID", { sensitivity: "base" });

/**
 * `relevan` keeps the order the API returned — that is the search ranking
 * itself — so only the explicit sorts copy and reorder.
 */
export function sortDestinations(items: Destination[], sort: SortKey): Destination[] {
  switch (sort) {
    case "rating":
      return [...items].sort(
        (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0),
      );
    case "populer":
      return [...items].sort(
        (a, b) => (b.view_count ?? 0) - (a.view_count ?? 0),
      );
    case "nama":
      return [...items].sort((a, b) => collator.compare(a.name, b.name));
    default:
      return items;
  }
}

export type ProvinceFacet = {
  id: number;
  name: string;
  count: number;
};

/**
 * Provinces present in the result set, with how many destinations each holds.
 * Built from the results rather than a province table so the sidebar can never
 * offer a filter that leads to an empty page.
 */
export function provinceFacets(items: Destination[]): ProvinceFacet[] {
  const byId = new Map<number, ProvinceFacet>();

  for (const item of items) {
    const province = item.provinces;
    if (!province?.id || !province.name) continue;
    const seen = byId.get(province.id);
    if (seen) seen.count += 1;
    else byId.set(province.id, { id: province.id, name: province.name, count: 1 });
  }

  return [...byId.values()].sort(
    (a, b) => b.count - a.count || collator.compare(a.name, b.name),
  );
}

/** Categories present in the result set — shown as counts, not as a filter. */
export function topCategories(items: Destination[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.category) continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}

export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}
