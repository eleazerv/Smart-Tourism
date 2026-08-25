/**
 * URL state for `/hotels`, mirroring the pattern `destinations-search.ts`
 * established: every filter is a link, so the results stay server-rendered and
 * a filtered view is shareable.
 */
import {
  FACILITIES,
  type Facility,
  type Stay,
  type StayType,
} from "@/lib/stay-data";

export const PAGE_SIZE = 10;

export const SORTS = [
  { key: "rekomendasi", label: "Paling sesuai" },
  { key: "termurah", label: "Harga terendah" },
  { key: "termahal", label: "Harga tertinggi" },
  { key: "rating", label: "Rating tamu" },
  { key: "bintang", label: "Bintang terbanyak" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
const SORT_KEYS = SORTS.map((sort) => sort.key) as readonly SortKey[];

/** Nightly-rate ceilings offered in the sidebar. */
export const PRICE_CAPS = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;
export const SCORE_STEPS = [4.5, 4, 3.5, 3] as const;

export type StaySearchState = {
  cityId: number | null;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  types: StayType[];
  stars: number[];
  minScore: number;
  maxPrice: number | null;
  facilities: Facility[];
  sort: SortKey;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : [value ?? ""];
  return [
    ...new Set(
      raw
        .flatMap((entry) => (entry ?? "").split(","))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * A week out, for two nights — the same "sometime soon" default every booking
 * form opens with. Computed from the server clock and threaded through as
 * state, so the form and the results always agree on the dates.
 */
export function defaultDates(now = new Date()) {
  return {
    checkIn: toISODate(addDays(now, 7)),
    checkOut: toISODate(addDays(now, 9)),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseStaySearch(
  params: RawSearchParams,
  now = new Date(),
): StaySearchState {
  const fallback = defaultDates(now);

  const rawIn = firstValue(params.checkin);
  const rawOut = firstValue(params.checkout);
  const checkIn = ISO_DATE.test(rawIn) ? rawIn : fallback.checkIn;
  // A checkout on or before the checkin would make the stay zero nights long,
  // so an out-of-order pair falls back to one night after the arrival.
  const checkOut =
    ISO_DATE.test(rawOut) && rawOut > checkIn
      ? rawOut
      : checkIn >= fallback.checkOut
        ? toISODate(addDays(new Date(checkIn), 2))
        : fallback.checkOut;

  // `Number("")` is 0, not NaN, so an absent parameter has to be caught before
  // the conversion — otherwise "no guests given" clamps to 1 instead of the
  // default 2.
  const number = (value: string | string[] | undefined): number | null => {
    const raw = firstValue(value);
    if (raw === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cityId = number(params.city);
  const guests = number(params.guests);
  const rooms = number(params.rooms);
  const minScore = number(params.score);
  const maxPrice = number(params.maxprice);
  const page = number(params.page);
  const sort = firstValue(params.sort) as SortKey;

  return {
    cityId: cityId !== null && cityId > 0 ? cityId : null,
    checkIn,
    checkOut,
    guests: guests === null ? 2 : Math.min(Math.max(guests, 1), 12),
    rooms: rooms === null ? 1 : Math.min(Math.max(rooms, 1), 6),
    types: parseList(params.type) as StayType[],
    stars: parseList(params.stars)
      .map(Number)
      .filter((value) => value >= 1 && value <= 5),
    minScore: minScore !== null && minScore > 0 ? minScore : 0,
    maxPrice: maxPrice !== null && maxPrice > 0 ? maxPrice : null,
    facilities: parseList(params.facility).filter((entry): entry is Facility =>
      (FACILITIES as readonly string[]).includes(entry),
    ),
    sort: SORT_KEYS.includes(sort) ? sort : "rekomendasi",
    page: page !== null && page > 1 ? Math.floor(page) : 1,
  };
}

export function toHref(state: StaySearchState, now = new Date()): string {
  const fallback = defaultDates(now);
  const params = new URLSearchParams();

  if (state.cityId !== null) params.set("city", String(state.cityId));
  if (state.checkIn !== fallback.checkIn) params.set("checkin", state.checkIn);
  if (state.checkOut !== fallback.checkOut)
    params.set("checkout", state.checkOut);
  if (state.guests !== 2) params.set("guests", String(state.guests));
  if (state.rooms !== 1) params.set("rooms", String(state.rooms));
  if (state.types.length) params.set("type", state.types.join(","));
  if (state.stars.length) params.set("stars", state.stars.join(","));
  if (state.minScore > 0) params.set("score", String(state.minScore));
  if (state.maxPrice !== null) params.set("maxprice", String(state.maxPrice));
  if (state.facilities.length)
    params.set("facility", state.facilities.join(","));
  if (state.sort !== "rekomendasi") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  return query ? `/hotels?${query}` : "/hotels";
}

/** Href for a state with `patch` applied; anything but paging resets to page 1. */
export function withFilter(
  state: StaySearchState,
  patch: Partial<StaySearchState>,
  now = new Date(),
): string {
  return toHref(
    { ...state, ...patch, page: "page" in patch ? (patch.page ?? 1) : 1 },
    now,
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export function withTypeToggled(
  state: StaySearchState,
  type: StayType,
  now = new Date(),
) {
  return withFilter(state, { types: toggle(state.types, type) }, now);
}

export function withStarToggled(
  state: StaySearchState,
  star: number,
  now = new Date(),
) {
  return withFilter(state, { stars: toggle(state.stars, star) }, now);
}

export function withFacilityToggled(
  state: StaySearchState,
  facility: Facility,
  now = new Date(),
) {
  return withFilter(
    state,
    { facilities: toggle(state.facilities, facility) },
    now,
  );
}

export function activeFilterCount(state: StaySearchState): number {
  return (
    state.types.length +
    state.stars.length +
    state.facilities.length +
    (state.minScore > 0 ? 1 : 0) +
    (state.maxPrice !== null ? 1 : 0)
  );
}

/** Whole nights between the two dates; at least one. */
export function nightCount(state: StaySearchState): number {
  const from = new Date(`${state.checkIn}T00:00:00Z`).getTime();
  const to = new Date(`${state.checkOut}T00:00:00Z`).getTime();
  const nights = Math.round((to - from) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

/* ------------------------------------------------------- result shaping --- */

/**
 * Applies every filter except the city, which the page handles separately so
 * the facet counts can be taken over the whole city.
 */
export function applyFilters(stays: Stay[], state: StaySearchState): Stay[] {
  return stays.filter((stay) => {
    if (state.types.length && !state.types.includes(stay.type)) return false;
    if (state.stars.length && !state.stars.includes(stay.stars)) return false;
    if (state.minScore > 0 && stay.score < state.minScore) return false;
    if (state.maxPrice !== null && stay.pricePerNight > state.maxPrice)
      return false;
    if (stay.maxGuests * state.rooms < state.guests) return false;
    return state.facilities.every((facility) =>
      stay.facilities.includes(facility),
    );
  });
}

const collator = new Intl.Collator("id-ID", { sensitivity: "base" });

export function sortStays(stays: Stay[], sort: SortKey): Stay[] {
  const sorted = [...stays];
  switch (sort) {
    case "termurah":
      return sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
    case "termahal":
      return sorted.sort((a, b) => b.pricePerNight - a.pricePerNight);
    case "rating":
      return sorted.sort(
        (a, b) => b.score - a.score || b.reviews - a.reviews,
      );
    case "bintang":
      return sorted.sort((a, b) => b.stars - a.stars || b.score - a.score);
    default:
      // "Paling sesuai": guest score first, with stars breaking ties and the
      // review count settling the rest, so a 4.8 with 900 reviews outranks a
      // 4.8 with 14.
      return sorted.sort(
        (a, b) =>
          b.score - a.score ||
          b.stars - a.stars ||
          b.reviews - a.reviews ||
          collator.compare(a.name, b.name),
      );
  }
}

export type Facet = { value: string; label: string; count: number };

export function typeFacets(stays: Stay[]): Map<StayType, number> {
  const counts = new Map<StayType, number>();
  for (const stay of stays) {
    counts.set(stay.type, (counts.get(stay.type) ?? 0) + 1);
  }
  return counts;
}

export function starFacets(stays: Stay[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const stay of stays) {
    counts.set(stay.stars, (counts.get(stay.stars) ?? 0) + 1);
  }
  return counts;
}

export function facilityFacets(stays: Stay[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const stay of stays) {
    for (const facility of stay.facilities) {
      counts.set(facility, (counts.get(facility) ?? 0) + 1);
    }
  }
  return counts;
}

export function formatScore(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** "Sab, 30 Agu" — the compact form booking forms use next to a date field. */
export function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
