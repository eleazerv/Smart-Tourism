import { intlLocale } from "@/lib/intl";
/**
 * URL state for `/flights`, following the same link-driven pattern as the
 * destination and hotel searches.
 *
 * The board is served by `GET /api/flights`, which answers one route on one
 * date. Airline, departure window, and seat availability are narrowed here
 * rather than in the query, because the API returns the whole day in one go.
 */
import {
  arrivalDayOffset,
  durationMinutes,
  minutesOfDay,
} from "@/lib/airports";
import type { FlightOption } from "@/lib/api";

export const PAGE_SIZE = 10;

export const SORTS = [
  { key: "termurah" },
  { key: "tercepat" },
  { key: "pagi" },
  { key: "malam" },
  { key: "tiba" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
const SORT_KEYS = SORTS.map((sort) => sort.key) as readonly SortKey[];

/** Departure windows, in minutes past midnight. */
export const TIME_WINDOWS = [
  { key: "pagi", hint: "05.00 – 11.00", from: 300, to: 660 },
  { key: "siang", hint: "11.00 – 15.00", from: 660, to: 900 },
  { key: "sore", hint: "15.00 – 19.00", from: 900, to: 1140 },
  { key: "malam", hint: "19.00 – 05.00", from: 1140, to: 1740 },
] as const;

export type TimeWindowKey = (typeof TIME_WINDOWS)[number]["key"];
const WINDOW_KEYS = TIME_WINDOWS.map((w) => w.key) as readonly TimeWindowKey[];

export type FlightSearchState = {
  from: string;
  to: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Airline names exactly as `flight_options.airline` stores them. */
  airlines: string[];
  windows: TimeWindowKey[];
  /** Hides flights whose seats have run out. */
  availableOnly: boolean;
  sort: SortKey;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Busiest domestic pair, so the page is useful before anyone touches the form. */
export const DEFAULT_ROUTE = { from: "CGK", to: "DPS" };

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

/** A week out — far enough ahead to be a realistic booking. */
export function defaultDate(now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 7);
  return toISODate(date);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFlightSearch(
  params: RawSearchParams,
  now = new Date(),
): FlightSearchState {
  const rawDate = firstValue(params.date);
  const page = Number(firstValue(params.page));
  const sort = firstValue(params.sort) as SortKey;

  const from = firstValue(params.from).toUpperCase() || DEFAULT_ROUTE.from;
  const to = firstValue(params.to).toUpperCase() || DEFAULT_ROUTE.to;

  return {
    from,
    // Flying somewhere to itself has no schedule; fall back rather than
    // rendering an empty board with no explanation.
    to:
      to === from
        ? DEFAULT_ROUTE.to === from
          ? DEFAULT_ROUTE.from
          : DEFAULT_ROUTE.to
        : to,
    date: ISO_DATE.test(rawDate) ? rawDate : defaultDate(now),
    airlines: parseList(params.airline),
    windows: parseList(params.time).filter((entry): entry is TimeWindowKey =>
      (WINDOW_KEYS as readonly string[]).includes(entry),
    ),
    availableOnly: firstValue(params.seats) === "ada",
    sort: SORT_KEYS.includes(sort) ? sort : "termurah",
    page: Number.isFinite(page) && page > 1 ? Math.floor(page) : 1,
  };
}

export function toHref(state: FlightSearchState, now = new Date()): string {
  const params = new URLSearchParams();

  if (state.from !== DEFAULT_ROUTE.from) params.set("from", state.from);
  if (state.to !== DEFAULT_ROUTE.to) params.set("to", state.to);
  if (state.date !== defaultDate(now)) params.set("date", state.date);
  if (state.airlines.length) params.set("airline", state.airlines.join(","));
  if (state.windows.length) params.set("time", state.windows.join(","));
  if (state.availableOnly) params.set("seats", "ada");
  if (state.sort !== "termurah") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  return query ? `/flights?${query}` : "/flights";
}

export function withFilter(
  state: FlightSearchState,
  patch: Partial<FlightSearchState>,
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

export function withAirlineToggled(
  state: FlightSearchState,
  airline: string,
  now = new Date(),
) {
  return withFilter(state, { airlines: toggle(state.airlines, airline) }, now);
}

export function withWindowToggled(
  state: FlightSearchState,
  key: TimeWindowKey,
  now = new Date(),
) {
  return withFilter(state, { windows: toggle(state.windows, key) }, now);
}

export function activeFilterCount(state: FlightSearchState): number {
  return (
    state.airlines.length + state.windows.length + (state.availableOnly ? 1 : 0)
  );
}

/** Link to the booking step. The flight is a real row, so its id is enough. */
export function bookingHref(flightId: string): string {
  return `/flights/pesan?flight=${encodeURIComponent(flightId)}`;
}

/** Reverses the route, keeping everything else the reader chose. */
export function swappedHref(state: FlightSearchState, now = new Date()): string {
  return withFilter(state, { from: state.to, to: state.from }, now);
}

/* ------------------------------------------------------- result shaping --- */

/**
 * A flight with the clock arithmetic already done, so filtering, sorting, and
 * the row itself all read the same numbers.
 */
export type FlightView = {
  flight: FlightOption;
  /** Minutes past midnight, local at the origin. */
  departMinutes: number;
  /**
   * Minutes past midnight on the arrival clock, plus a day per calendar day
   * crossed — so a value over 1440 means it lands tomorrow.
   */
  arriveMinutes: number;
  durationMin: number;
  dayOffset: number;
};

export function toView(flight: FlightOption): FlightView {
  const dayOffset = arrivalDayOffset(flight);
  return {
    flight,
    departMinutes: minutesOfDay(flight.departure_time),
    arriveMinutes: minutesOfDay(flight.arrival_time) + dayOffset * 1440,
    // Pakai durasi yang sudah dikoreksi zona waktu dari backend
    // (`flight_options_enriched`). Fallback ke hitungan mentah kalau field
    // ini belum ada -- backend lama atau endpoint yang belum dimigrasi.
    durationMin: flight.duration_minutes ?? durationMinutes(flight),
    dayOffset,
  };
}
/** Decorates a whole board. */
export function toViews(flights: FlightOption[]): FlightView[] {
  return flights.map(toView);
}

function inWindow(view: FlightView, key: TimeWindowKey): boolean {
  const window = TIME_WINDOWS.find((entry) => entry.key === key);
  if (!window) return true;
  const minutes = view.departMinutes;
  // The evening window wraps past midnight, so it is tested on both sides.
  return window.to > 1440
    ? minutes >= window.from || minutes < window.to - 1440
    : minutes >= window.from && minutes < window.to;
}

export function applyFilters(
  views: FlightView[],
  state: FlightSearchState,
): FlightView[] {
  return views.filter((view) => {
    if (state.availableOnly && view.flight.available_seats <= 0) return false;
    if (state.airlines.length && !state.airlines.includes(view.flight.airline))
      return false;
    if (
      state.windows.length &&
      !state.windows.some((key) => inWindow(view, key))
    )
      return false;
    return true;
  });
}

export function sortFlights(views: FlightView[], sort: SortKey): FlightView[] {
  const sorted = [...views];
  switch (sort) {
    case "tercepat":
      return sorted.sort((a, b) => a.durationMin - b.durationMin);
    case "pagi":
      return sorted.sort((a, b) => a.departMinutes - b.departMinutes);
    case "malam":
      return sorted.sort((a, b) => b.departMinutes - a.departMinutes);
    case "tiba":
      return sorted.sort((a, b) => a.arriveMinutes - b.arriveMinutes);
    default:
      return sorted.sort(
        (a, b) =>
          a.flight.price - b.flight.price || a.durationMin - b.durationMin,
      );
  }
}

export function airlineFacets(views: FlightView[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const view of views) {
    counts.set(view.flight.airline, (counts.get(view.flight.airline) ?? 0) + 1);
  }
  return new Map([...counts].sort((a, b) => a[0].localeCompare(b[0], "id")));
}

export function windowFacets(views: FlightView[]): Map<TimeWindowKey, number> {
  const counts = new Map<TimeWindowKey, number>();
  for (const window of TIME_WINDOWS) {
    counts.set(
      window.key,
      views.filter((view) => inWindow(view, window.key)).length,
    );
  }
  return counts;
}

export function availableCount(views: FlightView[]): number {
  return views.filter((view) => view.flight.available_seats > 0).length;
}

/** "Sab, 30 Agu 2026" */
export function formatDateLabel(iso: string, locale: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
