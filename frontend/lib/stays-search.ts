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

/** Ceilings the party picker offers and the parser enforces. */
export const MAX_GUESTS = 12;
export const MAX_ROOMS = 6;

export type StaySearchState = {
  cityId: number | null;
  /**
   * `YYYY-MM-DD`, or null while the reader has not said when.
   *
   * Nothing is assumed on their behalf: a stay nobody has dated cannot be
   * priced or checked for availability, and quietly inventing a week-from-now
   * default would put a total on screen that the reader never asked for.
   */
  checkIn: string | null;
  /** Always strictly after `checkIn` when both are set. */
  checkOut: string | null;
  /** Null until the reader states the party size. */
  guests: number | null;
  rooms: number | null;
  tiers: AccommodationTier[];
  maxPrice: number | null;
  sort: SortKey;
  page: number;
};

/** A search whose stay is fully dated — the only kind that can be priced. */
export type DatedStaySearch = StaySearchState & {
  checkIn: string;
  checkOut: string;
};

export function hasStayDates(state: StaySearchState): state is DatedStaySearch {
  return state.checkIn !== null && state.checkOut !== null;
}

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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseStaySearch(params: RawSearchParams): StaySearchState {
  const rawIn = firstValue(params.checkin);
  const rawOut = firstValue(params.checkout);

  // The dates only mean anything as a pair: a lone arrival prices no nights,
  // and a departure that is not after it describes no stay at all. A partial
  // pair is dropped rather than repaired, so "not chosen yet" stays honest.
  const arrival = ISO_DATE.test(rawIn) ? rawIn : null;
  const departure =
    arrival !== null && ISO_DATE.test(rawOut) && rawOut > arrival
      ? rawOut
      : null;
  const checkIn = departure === null ? null : arrival;

  // `Number("")` is 0, not NaN, so an absent parameter has to be caught before
  // the conversion — otherwise "no guests given" would read as a real 0.
  const number = (value: string | string[] | undefined): number | null => {
    const raw = firstValue(value);
    if (raw === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clamp = (value: number | null, max: number): number | null =>
    value !== null && value >= 1 ? Math.min(Math.floor(value), max) : null;

  const cityId = number(params.city);
  const maxPrice = number(params.maxprice);
  const page = number(params.page);
  const sort = firstValue(params.sort) as SortKey;

  const tierValues = TIERS.map((tier) => tier.value) as readonly string[];

  return {
    cityId: cityId !== null && cityId > 0 ? cityId : null,
    checkIn,
    checkOut: departure,
    guests: clamp(number(params.guests), MAX_GUESTS),
    rooms: clamp(number(params.rooms), MAX_ROOMS),
    tiers: parseList(params.tier).filter((entry): entry is AccommodationTier =>
      tierValues.includes(entry),
    ),
    maxPrice: maxPrice !== null && maxPrice > 0 ? maxPrice : null,
    sort: SORT_KEYS.includes(sort) ? sort : "rekomendasi",
    page: page !== null && page > 1 ? Math.floor(page) : 1,
  };
}

/**
 * Every set field, and nothing else. An unset date or party size leaves no
 * parameter behind, so a bare `/hotels` really is a search nobody has filled
 * in yet — which is what the pickers read to decide their placeholders.
 */
export function toHref(state: StaySearchState): string {
  const params = new URLSearchParams();

  if (state.cityId !== null) params.set("city", String(state.cityId));
  if (state.checkIn !== null) params.set("checkin", state.checkIn);
  if (state.checkOut !== null) params.set("checkout", state.checkOut);
  if (state.guests !== null) params.set("guests", String(state.guests));
  if (state.rooms !== null) params.set("rooms", String(state.rooms));
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
export function stayHref(state: StaySearchState, id: string): string {
  const params = new URLSearchParams();

  if (state.checkIn !== null) params.set("checkin", state.checkIn);
  if (state.checkOut !== null) params.set("checkout", state.checkOut);
  if (state.guests !== null) params.set("guests", String(state.guests));
  if (state.rooms !== null) params.set("rooms", String(state.rooms));

  const query = params.toString();
  return query ? `/hotels/${id}?${query}` : `/hotels/${id}`;
}

/**
 * Checkout for one property. Only reachable from a dated search — there is
 * nothing to reserve, price, or invoice until the nights are known, which the
 * type makes the caller prove rather than re-check at runtime.
 *
 * Unlike `stayHref` this always writes all four values out, so the checkout
 * never has to fall back to anything.
 */
export function stayBookingHref(state: DatedStaySearch, id: string): string {
  const params = new URLSearchParams({
    checkin: state.checkIn,
    checkout: state.checkOut,
    guests: String(state.guests ?? 1),
    rooms: String(state.rooms ?? 1),
  });
  return `/hotels/${id}/pesan?${params.toString()}`;
}

/** Href for a state with `patch` applied; anything but paging resets to page 1. */
export function withFilter(
  state: StaySearchState,
  patch: Partial<StaySearchState>,
): string {
  return toHref({
    ...state,
    ...patch,
    page: "page" in patch ? (patch.page ?? 1) : 1,
  });
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export function withTierToggled(
  state: StaySearchState,
  tier: AccommodationTier,
) {
  return withFilter(state, { tiers: toggle(state.tiers, tier) });
}

export function activeFilterCount(state: StaySearchState): number {
  return state.tiers.length + (state.maxPrice !== null ? 1 : 0);
}

/** Whole nights between the searched dates, or null while they are unset. */
export function nightCount(state: StaySearchState): number | null {
  return hasStayDates(state)
    ? nightsBetween(state.checkIn, state.checkOut)
    : null;
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
    // for. A row with no capacity recorded is not excluded on a guess, and
    // neither is anything at all until the reader states a party size.
    if (
      state.guests !== null &&
      stay.max_guests !== null &&
      stay.max_guests * (state.rooms ?? 1) < state.guests
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
