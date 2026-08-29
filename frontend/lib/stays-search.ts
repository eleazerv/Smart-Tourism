/**
 * URL state for `/hotels`, mirroring the pattern `destinations-search.ts`
 * established: every filter is a link, so the results stay server-rendered and
 * a filtered view is shareable.
 *
 * The facets here are only the ones `/api/accommodations` can actually back —
 * price, class, city, and capacity. Property type, star class, and facilities
 * went away when the page moved off its placeholder catalogue: no column
 * behind them exists, and a filter that sorts on invented values is worse than
 * one that is absent.
 */
import type { Accommodation, AccommodationTier } from "@/lib/api";
import { nightsBetween } from "@/lib/calendar";

export const PAGE_SIZE = 10;

export const TIERS: { value: AccommodationTier; label: string }[] = [
  { value: "budget", label: "Ekonomis" },
  { value: "mid", label: "Menengah" },
  { value: "luxury", label: "Mewah" },
];

const TIER_LABELS = new Map(TIERS.map((tier) => [tier.value, tier.label]));

export function tierLabel(tier: AccommodationTier): string {
  return TIER_LABELS.get(tier) ?? tier;
}

export const SORTS = [
  { key: "rekomendasi", label: "Paling sesuai" },
  { key: "termurah", label: "Harga terendah" },
  { key: "termahal", label: "Harga tertinggi" },
  { key: "kapasitas", label: "Kapasitas terbesar" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
const SORT_KEYS = SORTS.map((sort) => sort.key) as readonly SortKey[];

/** Nightly-rate ceilings offered in the sidebar. */
export const PRICE_CAPS = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;

export type StaySearchState = {
  cityId: number | null;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  tiers: AccommodationTier[];
  maxPrice: number | null;
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
  const maxPrice = number(params.maxprice);
  const page = number(params.page);
  const sort = firstValue(params.sort) as SortKey;

  const tierValues = TIERS.map((tier) => tier.value) as readonly string[];

  return {
    cityId: cityId !== null && cityId > 0 ? cityId : null,
    checkIn,
    checkOut,
    guests: guests === null ? 2 : Math.min(Math.max(guests, 1), 12),
    rooms: rooms === null ? 1 : Math.min(Math.max(rooms, 1), 6),
    tiers: parseList(params.tier).filter((entry): entry is AccommodationTier =>
      tierValues.includes(entry),
    ),
    maxPrice: maxPrice !== null && maxPrice > 0 ? maxPrice : null,
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
  if (state.tiers.length) params.set("tier", state.tiers.join(","));
  if (state.maxPrice !== null) params.set("maxprice", String(state.maxPrice));
  if (state.sort !== "rekomendasi") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  return query ? `/hotels?${query}` : "/hotels";
}

/**
 * Detail page for one property, carrying the dates and party size along so the
 * availability check there answers for the stay the reader was planning. The
 * facets and paging are deliberately left behind — they describe the list.
 */
export function stayHref(
  state: StaySearchState,
  id: string,
  now = new Date(),
): string {
  const fallback = defaultDates(now);
  const params = new URLSearchParams();

  if (state.checkIn !== fallback.checkIn) params.set("checkin", state.checkIn);
  if (state.checkOut !== fallback.checkOut)
    params.set("checkout", state.checkOut);
  if (state.guests !== 2) params.set("guests", String(state.guests));
  if (state.rooms !== 1) params.set("rooms", String(state.rooms));

  const query = params.toString();
  return query ? `/hotels/${id}?${query}` : `/hotels/${id}`;
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

export function withTierToggled(
  state: StaySearchState,
  tier: AccommodationTier,
  now = new Date(),
) {
  return withFilter(state, { tiers: toggle(state.tiers, tier) }, now);
}

export function activeFilterCount(state: StaySearchState): number {
  return state.tiers.length + (state.maxPrice !== null ? 1 : 0);
}

/** Whole nights between the searched dates; at least one. */
export function nightCount(state: StaySearchState): number {
  return nightsBetween(state.checkIn, state.checkOut);
}

/* ------------------------------------------------------- result shaping --- */

/**
 * Applies every filter except the city, which the page handles separately so
 * the facet counts can be taken over the whole city.
 */
export function applyFilters(
  stays: Accommodation[],
  state: StaySearchState,
): Accommodation[] {
  return stays.filter((stay) => {
    if (state.tiers.length && !state.tiers.includes(stay.tier)) return false;
    if (state.maxPrice !== null && stay.price_per_night > state.maxPrice)
      return false;
    // `max_guests` is per room, so the party has to fit across the rooms asked
    // for. A row with no capacity recorded is not excluded on a guess.
    if (
      stay.max_guests !== null &&
      stay.max_guests * state.rooms < state.guests
    )
      return false;
    return true;
  });
}

const collator = new Intl.Collator("id-ID", { sensitivity: "base" });

export function sortStays(
  stays: Accommodation[],
  sort: SortKey,
): Accommodation[] {
  const sorted = [...stays];
  switch (sort) {
    case "termurah":
      return sorted.sort((a, b) => a.price_per_night - b.price_per_night);
    case "termahal":
      return sorted.sort((a, b) => b.price_per_night - a.price_per_night);
    case "kapasitas":
      return sorted.sort(
        (a, b) =>
          (b.max_guests ?? 0) - (a.max_guests ?? 0) ||
          a.price_per_night - b.price_per_night,
      );
    default:
      // "Paling sesuai": no accommodation carries a rating yet, so ordering on
      // one would be ordering on zeroes. Cheapest first, with a stable
      // alphabetical tiebreak, is the honest default until reviews exist.
      return sorted.sort(
        (a, b) =>
          a.price_per_night - b.price_per_night ||
          collator.compare(a.name, b.name),
      );
  }
}

export type CityFacet = {
  id: number;
  name: string;
  province: string;
  count: number;
};

/**
 * Cities that actually have somewhere to stay, busiest first. Derived from the
 * rows rather than from the cities table, so the picker can never offer a city
 * that returns nothing.
 */
export function cityFacets(stays: Accommodation[]): CityFacet[] {
  const byId = new Map<number, CityFacet>();

  for (const stay of stays) {
    const city = stay.cities;
    if (!city) continue;

    const existing = byId.get(city.id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byId.set(city.id, {
      id: city.id,
      name: city.name,
      province: city.provinces?.name ?? "",
      count: 1,
    });
  }

  return [...byId.values()].sort(
    (a, b) => b.count - a.count || collator.compare(a.name, b.name),
  );
}

export function tierFacets(
  stays: Accommodation[],
): Map<AccommodationTier, number> {
  const counts = new Map<AccommodationTier, number>();
  for (const stay of stays) {
    counts.set(stay.tier, (counts.get(stay.tier) ?? 0) + 1);
  }
  return counts;
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
