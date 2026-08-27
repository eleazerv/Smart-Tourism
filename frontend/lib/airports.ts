/**
 * Airport reference data for `/flights`.
 *
 * Schedules and fares come from `GET /api/flights`, which keys routes by
 * `city_id`. This table is the bridge: it maps the airport code a traveller
 * recognises to that id, and carries the UTC offset needed to read a timetable
 * that stores every clock in its own airport's local time.
 */
export type Airport = {
  code: string;
  city: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  /** Hours ahead of UTC: 7 WIB, 8 WITA, 9 WIT. */
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

/** Only these can be searched — the rest have no city in the destinations API. */
export const ROUTE_AIRPORTS: Airport[] = AIRPORTS.filter(
  (entry): entry is Airport & { cityId: number } => entry.cityId !== null,
);

/**
 * Shown first in the airport picker, before the reader types anything — the
 * routes the catalogue actually leans on.
 */
export const POPULAR_CODES = ["CGK", "DPS", "JOG", "SUB", "UPG", "KNO"];

export function airportByCityId(cityId: number): Airport | null {
  return AIRPORTS.find((entry) => entry.cityId === cityId) ?? null;
}

/* ------------------------------------------------------------ timetable --- */

/** `06.35` from a naive `YYYY-MM-DDTHH:mm:ss`, without going through Date. */
export function clockOf(timestamp: string): string {
  return timestamp.slice(11, 16).replace(":", ".");
}

/** The `YYYY-MM-DD` half of a naive timestamp. */
export function dateOf(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function minutesSinceEpoch(timestamp: string): number {
  return Date.parse(`${timestamp.slice(0, 19)}Z`) / 60_000;
}

/** Minutes past local midnight, for the departure-window filters. */
export function minutesOfDay(timestamp: string): number {
  return Number(timestamp.slice(11, 13)) * 60 + Number(timestamp.slice(14, 16));
}

/**
 * Time in the air, straight from the two clocks the API prints.
 *
 * No zone correction: `flight_options` quotes both ends on the same clock, so
 * a Jakarta-Denpasar sector reads as the 1h50m it actually flies rather than
 * gaining the hour the map would suggest.
 */
export function durationMinutes(flight: {
  departure_time: string;
  arrival_time: string;
}): number {
  return (
    minutesSinceEpoch(flight.arrival_time) -
    minutesSinceEpoch(flight.departure_time)
  );
}

/** How many calendar days after departure the flight lands. */
export function arrivalDayOffset(flight: {
  departure_time: string;
  arrival_time: string;
}): number {
  const days =
    (Date.parse(`${dateOf(flight.arrival_time)}T00:00:00Z`) -
      Date.parse(`${dateOf(flight.departure_time)}T00:00:00Z`)) /
    86_400_000;
  return Math.max(Math.round(days), 0);
}

/** `2j 15m` */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}
