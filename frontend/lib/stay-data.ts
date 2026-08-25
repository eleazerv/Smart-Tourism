/**
 * Placeholder accommodation catalogue for `/hotels`.
 *
 * There is no `stays` table and no `/api/hotels` endpoint yet, so these rows
 * are generated rather than fetched — see `lib/seeded-random.ts` for why that
 * is deterministic. The cities are the real ones the destinations API returns,
 * so a stay in Yogyakarta sits in DI Yogyakarta and links back to the same
 * `city_id` the rest of the app uses.
 *
 * Rates and review counts are illustrative. Every surface that shows them also
 * carries a "data contoh" notice, because unlike the destination catalogue
 * there is nothing real behind these numbers.
 */
import { rng, roundPrice } from "@/lib/seeded-random";

export type StayType = "hotel" | "resort" | "villa" | "homestay" | "guesthouse";

export const STAY_TYPES: { value: StayType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resor" },
  { value: "villa", label: "Vila" },
  { value: "guesthouse", label: "Guest house" },
  { value: "homestay", label: "Homestay" },
];

export const FACILITIES = [
  "WiFi gratis",
  "AC",
  "Parkir gratis",
  "Sarapan",
  "Resepsionis 24 jam",
  "Restoran",
  "Ramah keluarga",
  "Kolam renang",
  "Antar-jemput bandara",
  "Pusat kebugaran",
  "Spa",
] as const;

export type Facility = (typeof FACILITIES)[number];

/**
 * How likely each facility is at a mid-range property, before the star-level
 * adjustment below. Drawn per facility rather than by picking N at random, so
 * the result reads like a real amenity list — nearly everywhere has WiFi, and
 * a spa stays the exception.
 */
const FACILITY_ODDS: Record<Facility, number> = {
  "WiFi gratis": 0.97,
  AC: 0.88,
  "Parkir gratis": 0.78,
  Sarapan: 0.72,
  "Resepsionis 24 jam": 0.6,
  Restoran: 0.55,
  "Ramah keluarga": 0.5,
  "Kolam renang": 0.42,
  "Antar-jemput bandara": 0.3,
  "Pusat kebugaran": 0.22,
  Spa: 0.16,
};

export type Stay = {
  id: string;
  name: string;
  type: StayType;
  cityId: number;
  cityName: string;
  provinceName: string;
  /** Generic locality, not a street address — there is no real one to quote. */
  area: string;
  stars: number;
  /** Guest score out of 5, matching the scale used across the rest of the app. */
  score: number;
  reviews: number;
  pricePerNight: number;
  facilities: Facility[];
  /** Walking distance to the town centre, in kilometres. */
  distanceKm: number;
  maxGuests: number;
};

/**
 * The cities the catalogue covers, with the `city_id` the destinations API
 * uses. `weight` is roughly how much accommodation each place has, so Bali and
 * Jakarta return a long list and Wamena a short one.
 */
const CITIES: {
  id: number;
  name: string;
  province: string;
  weight: number;
}[] = [
  { id: 1, name: "Jakarta", province: "DKI Jakarta", weight: 14 },
  { id: 6, name: "Denpasar", province: "Bali", weight: 14 },
  { id: 7, name: "Yogyakarta", province: "DI Yogyakarta", weight: 12 },
  { id: 13, name: "Gianyar", province: "Bali", weight: 9 },
  { id: 14, name: "Karangasem", province: "Bali", weight: 7 },
  { id: 2, name: "Surabaya", province: "Jawa Timur", weight: 9 },
  { id: 3, name: "Bandung", province: "Jawa Barat", weight: 11 },
  { id: 29, name: "Malang", province: "Jawa Timur", weight: 8 },
  { id: 27, name: "Magelang", province: "Jawa Tengah", weight: 6 },
  { id: 28, name: "Banyuwangi", province: "Jawa Timur", weight: 5 },
  { id: 4, name: "Medan", province: "Sumatera Utara", weight: 7 },
  { id: 23, name: "Toba", province: "Sumatera Utara", weight: 5 },
  { id: 25, name: "Bukittinggi", province: "Sumatera Barat", weight: 5 },
  { id: 26, name: "Banda Aceh", province: "Aceh", weight: 4 },
  { id: 24, name: "Belitung", province: "Kepulauan Bangka Belitung", weight: 5 },
  { id: 5, name: "Makassar", province: "Sulawesi Selatan", weight: 7 },
  { id: 20, name: "Toraja Utara", province: "Sulawesi Selatan", weight: 4 },
  { id: 21, name: "Manado", province: "Sulawesi Utara", weight: 6 },
  { id: 22, name: "Wakatobi", province: "Sulawesi Tenggara", weight: 4 },
  { id: 8, name: "Balikpapan", province: "Kalimantan Timur", weight: 5 },
  { id: 9, name: "Labuan Bajo", province: "Nusa Tenggara Timur", weight: 8 },
  { id: 11, name: "Lombok Tengah", province: "Nusa Tenggara Barat", weight: 7 },
  { id: 12, name: "Sumba Barat Daya", province: "Nusa Tenggara Timur", weight: 4 },
  { id: 15, name: "Raja Ampat", province: "Papua Barat Daya", weight: 4 },
  { id: 18, name: "Ambon", province: "Maluku", weight: 4 },
  { id: 16, name: "Wamena", province: "Papua Pegunungan", weight: 2 },
];

export const STAY_CITIES = CITIES.map(({ id, name, province }) => ({
  id,
  name,
  province,
}));

/* Name parts, combined per property. Deliberately generic — inventing a name
   that collides with a real hotel would attach made-up rates to a real
   business. */
const HOUSE_WORDS = [
  "Senja", "Cendana", "Kenanga", "Anggrek", "Nirwana", "Saujana", "Arunika",
  "Kirana", "Puspa", "Lentera", "Samudra", "Rimba", "Bayu", "Pelangi",
  "Mahoni", "Cempaka", "Bintang", "Embun", "Gemilang", "Tirta",
] as const;

const PREFIXES = ["Hotel", "The", "Wisma", "Griya", "Pondok"] as const;
const SUFFIXES = ["Suites", "Residence", "Inn", "Stay", "Retreat"] as const;

const AREAS = [
  "Pusat kota",
  "Dekat bandara",
  "Kawasan wisata",
  "Tepi pantai",
  "Area perbukitan",
  "Dekat stasiun",
] as const;

/** Nightly rate bands by star level, before the property-type multiplier. */
const RATE_BANDS: Record<number, [number, number]> = {
  1: [150_000, 280_000],
  2: [250_000, 460_000],
  3: [420_000, 850_000],
  4: [850_000, 1_900_000],
  5: [1_900_000, 5_200_000],
};

const TYPE_MULTIPLIER: Record<StayType, number> = {
  homestay: 0.55,
  guesthouse: 0.7,
  hotel: 1,
  villa: 1.45,
  resort: 1.6,
};

function nameFor(random: ReturnType<typeof rng>, city: string): string {
  const word = random.pick(HOUSE_WORDS);
  switch (random.int(0, 2)) {
    case 0:
      return `${random.pick(PREFIXES)} ${word}`;
    case 1:
      return `${word} ${random.pick(SUFFIXES)}`;
    default:
      return `${word} ${city}`;
  }
}

function buildStay(cityIndex: number, index: number): Stay {
  const city = CITIES[cityIndex];
  const random = rng(`stay-${city.id}-${index}`);

  const type = random.pick<StayType>([
    "hotel", "hotel", "hotel", "resort", "villa", "guesthouse", "homestay",
  ]);

  // Budget property types cannot plausibly carry five stars, and a resort is
  // rarely a one-star property — so the star range follows the type.
  const stars =
    type === "homestay"
      ? random.int(1, 3)
      : type === "guesthouse"
        ? random.int(2, 3)
        : type === "resort" || type === "villa"
          ? random.int(3, 5)
          : random.int(2, 5);

  const [low, high] = RATE_BANDS[stars];
  const pricePerNight = roundPrice(
    (low + random.next() * (high - low)) * TYPE_MULTIPLIER[type],
    10_000,
  );

  // Better-rated places skew higher, but the band overlaps so the sort by
  // score and the sort by stars do not produce the same list.
  const score = Math.round((2.8 + stars * 0.28 + random.next() * 0.7) * 10) / 10;

  return {
    id: `stay-${city.id}-${index}`,
    name: nameFor(random, city.name),
    type,
    cityId: city.id,
    cityName: city.name,
    provinceName: city.province,
    area: random.pick(AREAS),
    stars,
    score: Math.min(score, 5),
    reviews: random.int(12, 1840),
    pricePerNight,
    // Smarter properties carry more of the optional amenities, so the odds
    // shift with the star level rather than staying flat across the catalogue.
    facilities: FACILITIES.filter((facility) =>
      random.chance(
        Math.min(FACILITY_ODDS[facility] * (0.55 + stars * 0.18), 0.98),
      ),
    ),
    distanceKm: Math.round(random.next() * 90) / 10,
    maxGuests: random.pick([2, 2, 3, 4, 4, 6]),
  };
}

let cached: Stay[] | null = null;

/** The whole catalogue, built once per process. */
export function allStays(): Stay[] {
  if (cached) return cached;
  cached = CITIES.flatMap((city, cityIndex) =>
    Array.from({ length: city.weight }, (_, i) => buildStay(cityIndex, i)),
  );
  return cached;
}

export function stayTypeLabel(type: StayType): string {
  return STAY_TYPES.find((entry) => entry.value === type)?.label ?? type;
}
