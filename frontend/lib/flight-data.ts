/**
 * Placeholder flight catalogue for `/flights`.
 *
 * There is no `flights` table and no `/api/flights` endpoint, so schedules are
 * generated per route from a seed rather than stored — see
 * `lib/seeded-random.ts`. What is *not* invented is the geography: airports
 * carry their real coordinates, and every duration and fare below is derived
 * from the great-circle distance between them, so Jakarta–Bali stays shorter
 * and cheaper than Jakarta–Jayapura no matter which seed comes up.
 *
 * Fares are illustrative. Every surface that shows one also carries a
 * "data contoh" notice.
 */
import { rng, roundPrice } from "@/lib/seeded-random";

export type Airport = {
  code: string;
  city: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  /** Hours ahead of UTC: 7 WIB, 8 WITA, 9 WIT. Arrival clocks are local. */
  utcOffset: 7 | 8 | 9;
  /** `city_id` from the destinations API, where the city is one it covers. */
  cityId: number | null;
};

export const AIRPORTS: Airport[] = [
  { code: "CGK", city: "Jakarta", name: "Soekarno-Hatta", province: "Banten", lat: -6.1256, lng: 106.6558, utcOffset: 7, cityId: 1 },
  { code: "DPS", city: "Denpasar", name: "I Gusti Ngurah Rai", province: "Bali", lat: -8.7482, lng: 115.1672, utcOffset: 8, cityId: 6 },
  { code: "JOG", city: "Yogyakarta", name: "Yogyakarta International", province: "DI Yogyakarta", lat: -7.9006, lng: 110.0573, utcOffset: 7, cityId: 7 },
  { code: "SUB", city: "Surabaya", name: "Juanda", province: "Jawa Timur", lat: -7.3798, lng: 112.7873, utcOffset: 7, cityId: 2 },
  { code: "BDO", city: "Bandung", name: "Husein Sastranegara", province: "Jawa Barat", lat: -6.9006, lng: 107.5763, utcOffset: 7, cityId: 3 },
  { code: "MLG", city: "Malang", name: "Abdul Rachman Saleh", province: "Jawa Timur", lat: -7.9265, lng: 112.7146, utcOffset: 7, cityId: 29 },
  { code: "SOC", city: "Solo", name: "Adi Soemarmo", province: "Jawa Tengah", lat: -7.5161, lng: 110.7569, utcOffset: 7, cityId: null },
  { code: "KNO", city: "Medan", name: "Kualanamu", province: "Sumatera Utara", lat: 3.6422, lng: 98.8853, utcOffset: 7, cityId: 4 },
  { code: "BTJ", city: "Banda Aceh", name: "Sultan Iskandar Muda", province: "Aceh", lat: 5.5236, lng: 95.4204, utcOffset: 7, cityId: 26 },
  { code: "PDG", city: "Padang", name: "Minangkabau", province: "Sumatera Barat", lat: -0.7868, lng: 100.2807, utcOffset: 7, cityId: null },
  { code: "PKU", city: "Pekanbaru", name: "Sultan Syarif Kasim II", province: "Riau", lat: 0.4608, lng: 101.4445, utcOffset: 7, cityId: null },
  { code: "TJQ", city: "Belitung", name: "H.A.S. Hanandjoeddin", province: "Kepulauan Bangka Belitung", lat: -2.7457, lng: 107.7549, utcOffset: 7, cityId: 24 },
  { code: "UPG", city: "Makassar", name: "Sultan Hasanuddin", province: "Sulawesi Selatan", lat: -5.0616, lng: 119.5541, utcOffset: 8, cityId: 5 },
  { code: "MDC", city: "Manado", name: "Sam Ratulangi", province: "Sulawesi Utara", lat: 1.5493, lng: 124.9264, utcOffset: 8, cityId: 21 },
  { code: "BPN", city: "Balikpapan", name: "Sultan Aji Muhammad Sulaiman", province: "Kalimantan Timur", lat: -1.2683, lng: 116.8947, utcOffset: 8, cityId: 8 },
  { code: "PNK", city: "Pontianak", name: "Supadio", province: "Kalimantan Barat", lat: -0.1507, lng: 109.4039, utcOffset: 7, cityId: null },
  { code: "LOP", city: "Lombok", name: "Zainuddin Abdul Madjid", province: "Nusa Tenggara Barat", lat: -8.7573, lng: 116.2769, utcOffset: 8, cityId: 11 },
  { code: "LBJ", city: "Labuan Bajo", name: "Komodo", province: "Nusa Tenggara Timur", lat: -8.4866, lng: 119.889, utcOffset: 8, cityId: 9 },
  { code: "KOE", city: "Kupang", name: "El Tari", province: "Nusa Tenggara Timur", lat: -10.1716, lng: 123.6709, utcOffset: 8, cityId: null },
  { code: "AMQ", city: "Ambon", name: "Pattimura", province: "Maluku", lat: -3.7103, lng: 128.0893, utcOffset: 9, cityId: 18 },
  { code: "TTE", city: "Ternate", name: "Sultan Babullah", province: "Maluku Utara", lat: 0.8314, lng: 127.3812, utcOffset: 9, cityId: 19 },
  { code: "SOQ", city: "Sorong", name: "Domine Eduard Osok", province: "Papua Barat Daya", lat: -0.894, lng: 131.1216, utcOffset: 9, cityId: 15 },
  { code: "DJJ", city: "Jayapura", name: "Sentani", province: "Papua", lat: -2.5769, lng: 140.5164, utcOffset: 9, cityId: null },
];

export function airport(code: string): Airport | null {
  return AIRPORTS.find((entry) => entry.code === code) ?? null;
}

export type Airline = {
  code: string;
  name: string;
  /** Fare multiplier against the distance-derived base. */
  priceFactor: number;
  /** Checked baggage included, in kg. 0 means cabin bag only. */
  baggageKg: number;
  fleet: string[];
};

export const AIRLINES: Airline[] = [
  { code: "GA", name: "Garuda Indonesia", priceFactor: 1.48, baggageKg: 20, fleet: ["Boeing 737-800", "Airbus A330-300"] },
  { code: "ID", name: "Batik Air", priceFactor: 1.16, baggageKg: 20, fleet: ["Airbus A320", "Boeing 737-900ER"] },
  { code: "IP", name: "Pelita Air", priceFactor: 1.1, baggageKg: 20, fleet: ["Airbus A320"] },
  { code: "QG", name: "Citilink", priceFactor: 0.97, baggageKg: 20, fleet: ["Airbus A320"] },
  { code: "JT", name: "Lion Air", priceFactor: 0.92, baggageKg: 20, fleet: ["Boeing 737-800", "Boeing 737-900ER"] },
  { code: "IU", name: "Super Air Jet", priceFactor: 0.85, baggageKg: 0, fleet: ["Airbus A320"] },
  { code: "8B", name: "TransNusa", priceFactor: 0.9, baggageKg: 20, fleet: ["Airbus A320", "ATR 72-600"] },
];

export type Cabin = "ekonomi" | "bisnis";

export type Flight = {
  id: string;
  airlineCode: string;
  airlineName: string;
  flightNo: string;
  from: string;
  to: string;
  /** Minutes past local midnight at the origin, on the departure date. */
  departMinutes: number;
  /**
   * Minutes past midnight at the *destination*, on the departure date — so a
   * value over 1440 means the flight lands the next day. Indonesia spans three
   * zones, and a board that showed Jakarta time for a Bali arrival would be an
   * hour out on the country's busiest route.
   */
  arriveMinutes: number;
  /** Time in the air plus taxi, independent of the zone change. */
  durationMin: number;
  stops: 0 | 1;
  /** Airport code of the connection, for a one-stop itinerary. */
  via: string | null;
  price: number;
  baggageKg: number;
  aircraft: string;
};

const EARTH_KM = 6371;

/** Great-circle distance between two airports, in kilometres. */
export function distanceKm(from: Airport, to: Airport): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

/** Cruise speed plus taxi, hold, and approach. */
function blockMinutes(km: number): number {
  return Math.round(km / 13 + 35);
}

export const CABIN_FACTOR: Record<Cabin, number> = {
  ekonomi: 1,
  bisnis: 2.7,
};

/** The operating day, in minutes past midnight: first wave 05.00, last 21.20. */
const FIRST_DEPARTURE = 5 * 60;
const LAST_DEPARTURE = 21 * 60 + 20;
const OPERATING_MINUTES = LAST_DEPARTURE - FIRST_DEPARTURE;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The day's schedule for one route.
 *
 * Seeded on route and date, so paging through results or reloading gives the
 * same flights, while a different date gives a plausibly different day.
 */
export function flightsFor(
  fromCode: string,
  toCode: string,
  date: string,
  cabin: Cabin = "ekonomi",
): Flight[] {
  const from = airport(fromCode);
  const to = airport(toCode);
  if (!from || !to || from.code === to.code) return [];

  const km = distanceKm(from, to);
  const direct = blockMinutes(km);
  const random = rng(`flight-${fromCode}-${toCode}-${date}`);

  // Busy trunk routes get a fuller timetable than thin regional ones. The
  // threshold sits above Jakarta–Bali (~980 km) so the country's busiest pair
  // lands in the frequent band rather than the long-haul one.
  const count = km < 1200 ? random.int(7, 12) : random.int(4, 9);

  const flights: Flight[] = [];
  for (let i = 0; i < count; i++) {
    const airline = random.pick(AIRLINES);

    // Long sectors are the ones that realistically need a connection, and even
    // then most departures are direct.
    const stops: 0 | 1 = km > 1500 && random.chance(0.35) ? 1 : 0;
    const via = stops === 1 ? pickConnection(from, to, random) : null;

    const durationMin =
      stops === 0 ? direct + random.int(-8, 12) : direct + random.int(70, 165);

    // Departures spread across the operating day, earliest first. Dividing by
    // `count - 1` puts the last one at the end of the window rather than one
    // slot short of it, which on a thin route used to mean nothing after 18.00.
    const departMinutes = clamp(
      FIRST_DEPARTURE +
        Math.round((i * OPERATING_MINUTES) / Math.max(count - 1, 1)) +
        random.int(-20, 20),
      FIRST_DEPARTURE,
      LAST_DEPARTURE,
    );

    const base = 340_000 + km * 880;
    const price = roundPrice(
      base *
        airline.priceFactor *
        CABIN_FACTOR[cabin] *
        (stops === 1 ? 0.88 : 1) *
        (0.88 + random.next() * 0.26),
      1000,
    );

    flights.push({
      id: `${fromCode}-${toCode}-${date}-${i}`,
      arriveMinutes:
        departMinutes + durationMin + (to.utcOffset - from.utcOffset) * 60,
      airlineCode: airline.code,
      airlineName: airline.name,
      flightNo: `${airline.code} ${random.int(100, 899)}`,
      from: fromCode,
      to: toCode,
      departMinutes,
      durationMin,
      stops,
      via,
      price,
      baggageKg: airline.baggageKg,
      aircraft: random.pick(airline.fleet),
    });
  }

  return flights.sort((a, b) => a.departMinutes - b.departMinutes);
}

/** A hub that actually lies roughly between the two endpoints. */
function pickConnection(
  from: Airport,
  to: Airport,
  random: ReturnType<typeof rng>,
): string {
  const direct = distanceKm(from, to);
  const hubs = ["CGK", "UPG", "SUB", "DPS", "BPN"]
    .map(airport)
    .filter((hub): hub is Airport => hub !== null)
    .filter(
      (hub) =>
        hub.code !== from.code &&
        hub.code !== to.code &&
        // Rules out a "connection" that doubles the distance flown.
        distanceKm(from, hub) + distanceKm(hub, to) < direct * 1.45,
    );

  return hubs.length > 0 ? random.pick(hubs).code : "CGK";
}

/* -------------------------------------------------------- presentation --- */

/** `06:35`, from minutes past midnight. */
export function formatClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/** `2j 15m` */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}

export function arrivalMinutes(flight: Flight): number {
  return flight.arriveMinutes;
}

/**
 * How many calendar days after departure the flight lands, in destination
 * local time. Negative is impossible here: no Indonesian sector is shorter
 * than the two-hour zone change it can cross.
 */
export function arrivalDayOffset(flight: Flight): number {
  return Math.floor(flight.arriveMinutes / 1440);
}
