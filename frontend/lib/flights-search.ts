/**
 * URL state for `/flights`, following the same link-driven pattern as the
 * destination and hotel searches.
 */
import {
  arrivalMinutes,
  type Cabin,
  type Flight,
} from "@/lib/flight-data";

export const PAGE_SIZE = 10;

export const SORTS = [
  { key: "termurah", label: "Harga terendah" },
  { key: "tercepat", label: "Durasi tersingkat" },
  { key: "pagi", label: "Berangkat paling awal" },
  { key: "malam", label: "Berangkat paling akhir" },
  { key: "tiba", label: "Tiba paling awal" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
const SORT_KEYS = SORTS.map((sort) => sort.key) as readonly SortKey[];

/** Departure windows, in minutes past midnight. */
export const TIME_WINDOWS = [
  { key: "pagi", label: "Pagi", hint: "05.00 – 11.00", from: 300, to: 660 },
  { key: "siang", label: "Siang", hint: "11.00 – 15.00", from: 660, to: 900 },
  { key: "sore", label: "Sore", hint: "15.00 – 19.00", from: 900, to: 1140 },
  { key: "malam", label: "Malam", hint: "19.00 – 05.00", from: 1140, to: 1740 },
] as const;

export type TimeWindowKey = (typeof TIME_WINDOWS)[number]["key"];
const WINDOW_KEYS = TIME_WINDOWS.map((w) => w.key) as readonly TimeWindowKey[];

export type FlightSearchState = {
  from: string;
  to: string;
  /** `YYYY-MM-DD`. */
  date: string;
  passengers: number;
  cabin: Cabin;
  airlines: string[];
  /** `null` means any; 0 direct only; 1 allows one connection. */
  maxStops: number | null;
  windows: TimeWindowKey[];
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
  const passengers = Number(firstValue(params.pax));
  const page = Number(firstValue(params.page));
  const stops = firstValue(params.stops);
  const sort = firstValue(params.sort) as SortKey;
  const cabin = firstValue(params.cabin);

  const from = firstValue(params.from).toUpperCase() || DEFAULT_ROUTE.from;
  const to = firstValue(params.to).toUpperCase() || DEFAULT_ROUTE.to;

  return {
    from,
    // Flying somewhere to itself has no schedule; fall back rather than
    // rendering an empty board with no explanation.
    to: to === from ? DEFAULT_ROUTE.to === from ? DEFAULT_ROUTE.from : DEFAULT_ROUTE.to : to,
    date: ISO_DATE.test(rawDate) ? rawDate : defaultDate(now),
    passengers:
      Number.isFinite(passengers) && passengers >= 1
        ? Math.min(Math.floor(passengers), 9)
        : 1,
    cabin: cabin === "bisnis" ? "bisnis" : "ekonomi",
    airlines: parseList(params.airline).map((code) => code.toUpperCase()),
    maxStops: stops === "0" ? 0 : stops === "1" ? 1 : null,
    windows: parseList(params.time).filter((entry): entry is TimeWindowKey =>
      (WINDOW_KEYS as readonly string[]).includes(entry),
    ),
    sort: SORT_KEYS.includes(sort) ? sort : "termurah",
    page: Number.isFinite(page) && page > 1 ? Math.floor(page) : 1,
  };
}

export function toHref(state: FlightSearchState, now = new Date()): string {
  const params = new URLSearchParams();

  if (state.from !== DEFAULT_ROUTE.from) params.set("from", state.from);
  if (state.to !== DEFAULT_ROUTE.to) params.set("to", state.to);
  if (state.date !== defaultDate(now)) params.set("date", state.date);
  if (state.passengers !== 1) params.set("pax", String(state.passengers));
  if (state.cabin !== "ekonomi") params.set("cabin", state.cabin);
  if (state.airlines.length) params.set("airline", state.airlines.join(","));
  if (state.maxStops !== null) params.set("stops", String(state.maxStops));
  if (state.windows.length) params.set("time", state.windows.join(","));
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
  code: string,
  now = new Date(),
) {
  return withFilter(state, { airlines: toggle(state.airlines, code) }, now);
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
    state.airlines.length +
    state.windows.length +
    (state.maxStops !== null ? 1 : 0)
  );
}

/**
 * Link to the booking step for one flight.
 *
 * Carries the search itself rather than the flight's details: schedules are
 * regenerated from route, date and cabin, so the booking page rebuilds the same
 * timetable and looks the flight up by id. Nothing has to be stashed in a
 * session, and the URL stays shareable.
 */
export function bookingHref(state: FlightSearchState, flightId: string): string {
  const params = new URLSearchParams({
    from: state.from,
    to: state.to,
    date: state.date,
    cabin: state.cabin,
    pax: String(state.passengers),
    flight: flightId,
  });
  return `/flights/pesan?${params.toString()}`;
}

/** Reverses the route, keeping everything else the reader chose. */
export function swappedHref(state: FlightSearchState, now = new Date()): string {
  return withFilter(state, { from: state.to, to: state.from }, now);
}

/* ------------------------------------------------------- result shaping --- */

function inWindow(flight: Flight, key: TimeWindowKey): boolean {
  const window = TIME_WINDOWS.find((entry) => entry.key === key);
  if (!window) return true;
  const minutes = flight.departMinutes;
  // The evening window wraps past midnight, so it is tested on both sides.
  return window.to > 1440
    ? minutes >= window.from || minutes < window.to - 1440
    : minutes >= window.from && minutes < window.to;
}

export function applyFilters(
  flights: Flight[],
  state: FlightSearchState,
): Flight[] {
  return flights.filter((flight) => {
    if (state.maxStops !== null && flight.stops > state.maxStops) return false;
    if (state.airlines.length && !state.airlines.includes(flight.airlineCode))
      return false;
    if (
      state.windows.length &&
      !state.windows.some((key) => inWindow(flight, key))
    )
      return false;
    return true;
  });
}

export function sortFlights(flights: Flight[], sort: SortKey): Flight[] {
  const sorted = [...flights];
  switch (sort) {
    case "tercepat":
      return sorted.sort((a, b) => a.durationMin - b.durationMin);
    case "pagi":
      return sorted.sort((a, b) => a.departMinutes - b.departMinutes);
    case "malam":
      return sorted.sort((a, b) => b.departMinutes - a.departMinutes);
    case "tiba":
      return sorted.sort((a, b) => arrivalMinutes(a) - arrivalMinutes(b));
    default:
      return sorted.sort((a, b) => a.price - b.price || a.durationMin - b.durationMin);
  }
}

export function airlineFacets(flights: Flight[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const flight of flights) {
    counts.set(flight.airlineCode, (counts.get(flight.airlineCode) ?? 0) + 1);
  }
  return counts;
}

export function windowFacets(flights: Flight[]): Map<TimeWindowKey, number> {
  const counts = new Map<TimeWindowKey, number>();
  for (const window of TIME_WINDOWS) {
    counts.set(
      window.key,
      flights.filter((flight) => inWindow(flight, window.key)).length,
    );
  }
  return counts;
}

export function stopFacets(flights: Flight[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const flight of flights) {
    counts.set(flight.stops, (counts.get(flight.stops) ?? 0) + 1);
  }
  return counts;
}

/** "Sab, 30 Agu 2026" */
export function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
