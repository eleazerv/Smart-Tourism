/**
 * Geography and scales for the crowd map on the landing page.
 *
 * `GET /api/heatmap` answers with `{ province_code, province_name,
 * visitor_count }` and nothing else — no coordinates, no grouping. The map
 * needs a point per province, so the archipelago lives here as a static table
 * keyed by the BPS code the API returns.
 */
import type { HeatmapEntry } from "@/lib/api";

/* ------------------------------------------------------------- regions --- */

export type RegionKey =
  | "sumatera"
  | "jawa"
  | "balinusa"
  | "kalimantan"
  | "sulawesi"
  | "maluku"
  | "papua"
  /** Escape hatch for a province code this table does not know yet. */
  | "lainnya";

/** `[[south, west], [north, east]]` — what Leaflet's `fitBounds` expects. */
export type Bounds = [[number, number], [number, number]];

export type Region = {
  key: RegionKey | "semua";
  label: string;
  /**
   * The box the camera fits when this region is picked. Bounds rather than a
   * centre-and-zoom pair so the fit follows the container: the same region
   * fills a 1000px desktop map and a 340px phone map without cropping.
   */
  bounds: Bounds;
};

const INDONESIA: Bounds = [
  [-11.2, 94.8],
  [6.2, 141.2],
];

/** The whole country, and each island group the filter can zoom to. */
export const REGIONS: Region[] = [
  { key: "semua", label: "Semua daerah", bounds: INDONESIA },
  { key: "sumatera", label: "Sumatera", bounds: [[-6.2, 94.8], [6.2, 109.5]] },
  { key: "jawa", label: "Jawa", bounds: [[-8.9, 104.9], [-5.4, 114.8]] },
  { key: "balinusa", label: "Bali & Nusa Tenggara", bounds: [[-11.0, 114.3], [-7.6, 125.3]] },
  { key: "kalimantan", label: "Kalimantan", bounds: [[-4.4, 108.7], [4.5, 119.4]] },
  { key: "sulawesi", label: "Sulawesi", bounds: [[-6.3, 118.4], [2.3, 125.6]] },
  { key: "maluku", label: "Maluku", bounds: [[-8.6, 124.4], [3.1, 135.6]] },
  { key: "papua", label: "Papua", bounds: [[-9.3, 130.4], [0.6, 141.3]] },
  { key: "lainnya", label: "Lainnya", bounds: INDONESIA },
];

export const NATIONAL_BOUNDS = INDONESIA;

export function regionBounds(key: RegionKey | "semua"): Bounds {
  return REGIONS.find((region) => region.key === key)?.bounds ?? INDONESIA;
}

export function regionLabel(key: RegionKey | "semua"): string {
  return REGIONS.find((region) => region.key === key)?.label ?? "Semua daerah";
}

/* ----------------------------------------------------------- provinces --- */

export type ProvincePlace = {
  /** BPS code — the join key against `HeatmapEntry.province_code`. */
  code: string;
  name: string;
  /**
   * `provinces.id`, which is what `/destinations?province_id=` filters on.
   * The API exposes it on every destination row (`provinces.id`); it is not
   * the BPS code, so the mapping is spelled out rather than derived.
   */
  id: number;
  region: RegionKey;
  /** Rough centroid of the province, in degrees. */
  lat: number;
  lng: number;
};

const PROVINCES: ProvincePlace[] = [
  { code: "11", name: "Aceh", id: 1, region: "sumatera", lat: 4.36, lng: 96.75 },
  { code: "12", name: "Sumatera Utara", id: 2, region: "sumatera", lat: 2.19, lng: 99.1 },
  { code: "13", name: "Sumatera Barat", id: 3, region: "sumatera", lat: -0.95, lng: 100.6 },
  { code: "14", name: "Riau", id: 4, region: "sumatera", lat: 0.5, lng: 101.7 },
  { code: "15", name: "Jambi", id: 5, region: "sumatera", lat: -1.61, lng: 102.7 },
  { code: "16", name: "Sumatera Selatan", id: 6, region: "sumatera", lat: -3.2, lng: 104.1 },
  { code: "17", name: "Bengkulu", id: 7, region: "sumatera", lat: -3.55, lng: 102.35 },
  { code: "18", name: "Lampung", id: 8, region: "sumatera", lat: -4.85, lng: 105.15 },
  { code: "19", name: "Kepulauan Bangka Belitung", id: 9, region: "sumatera", lat: -2.55, lng: 106.6 },
  { code: "21", name: "Kepulauan Riau", id: 10, region: "sumatera", lat: 0.92, lng: 104.45 },
  { code: "31", name: "DKI Jakarta", id: 11, region: "jawa", lat: -6.2, lng: 106.83 },
  { code: "32", name: "Jawa Barat", id: 12, region: "jawa", lat: -6.9, lng: 107.6 },
  { code: "33", name: "Jawa Tengah", id: 13, region: "jawa", lat: -7.3, lng: 110.1 },
  { code: "34", name: "DI Yogyakarta", id: 14, region: "jawa", lat: -7.85, lng: 110.4 },
  { code: "35", name: "Jawa Timur", id: 15, region: "jawa", lat: -7.7, lng: 112.6 },
  { code: "36", name: "Banten", id: 16, region: "jawa", lat: -6.4, lng: 106.05 },
  { code: "51", name: "Bali", id: 17, region: "balinusa", lat: -8.4, lng: 115.15 },
  { code: "52", name: "Nusa Tenggara Barat", id: 18, region: "balinusa", lat: -8.65, lng: 117.4 },
  { code: "53", name: "Nusa Tenggara Timur", id: 19, region: "balinusa", lat: -8.95, lng: 121.2 },
  { code: "61", name: "Kalimantan Barat", id: 20, region: "kalimantan", lat: 0.0, lng: 110.3 },
  { code: "62", name: "Kalimantan Tengah", id: 21, region: "kalimantan", lat: -1.7, lng: 113.4 },
  { code: "63", name: "Kalimantan Selatan", id: 22, region: "kalimantan", lat: -3.1, lng: 115.3 },
  { code: "64", name: "Kalimantan Timur", id: 23, region: "kalimantan", lat: 0.5, lng: 116.5 },
  { code: "65", name: "Kalimantan Utara", id: 24, region: "kalimantan", lat: 2.9, lng: 116.5 },
  { code: "71", name: "Sulawesi Utara", id: 25, region: "sulawesi", lat: 1.35, lng: 124.7 },
  { code: "72", name: "Sulawesi Tengah", id: 26, region: "sulawesi", lat: -1.45, lng: 121.0 },
  { code: "73", name: "Sulawesi Selatan", id: 27, region: "sulawesi", lat: -3.9, lng: 120.1 },
  { code: "74", name: "Sulawesi Tenggara", id: 28, region: "sulawesi", lat: -4.15, lng: 122.1 },
  { code: "75", name: "Gorontalo", id: 29, region: "sulawesi", lat: 0.7, lng: 122.45 },
  { code: "76", name: "Sulawesi Barat", id: 30, region: "sulawesi", lat: -2.7, lng: 119.2 },
  { code: "81", name: "Maluku", id: 31, region: "maluku", lat: -3.7, lng: 129.1 },
  { code: "82", name: "Maluku Utara", id: 32, region: "maluku", lat: 0.8, lng: 127.8 },
  { code: "91", name: "Papua Barat", id: 33, region: "papua", lat: -1.6, lng: 133.3 },
  { code: "92", name: "Papua Barat Daya", id: 34, region: "papua", lat: -1.3, lng: 131.5 },
  { code: "94", name: "Papua", id: 35, region: "papua", lat: -3.0, lng: 139.7 },
  { code: "95", name: "Papua Selatan", id: 36, region: "papua", lat: -7.2, lng: 139.6 },
  { code: "96", name: "Papua Tengah", id: 37, region: "papua", lat: -3.6, lng: 136.3 },
  { code: "97", name: "Papua Pegunungan", id: 38, region: "papua", lat: -4.1, lng: 139.0 },
];

const PLACE_BY_CODE = new Map(PROVINCES.map((place) => [place.code, place]));

/** Which island group a BPS province code belongs to. Shared with the trip
 *  planner, so a city inherits its province's region. */
export function regionOfProvince(code: string): RegionKey {
  return PLACE_BY_CODE.get(code)?.region ?? "lainnya";
}

/* -------------------------------------------------------------- levels --- */

/** Five crowding bands, quiet first. Index doubles as the level value. */
export const DENSITY_LEVELS = [
  { label: "Sangat sepi", color: "#2dd4bf", blurb: "Nyaris tanpa antrean" },
  { label: "Sepi", color: "#a3e635", blurb: "Masih longgar" },
  { label: "Sedang", color: "#fbbf24", blurb: "Ramai di akhir pekan" },
  { label: "Ramai", color: "#f97316", blurb: "Siapkan waktu ekstra" },
  { label: "Sangat ramai", color: "#dc2626", blurb: "Padat sepanjang tahun" },
] as const;

export type DensityLevel = 0 | 1 | 2 | 3 | 4;

/* -------------------------------------------------------------- points --- */

export type DensityPoint = {
  code: string;
  name: string;
  /** Null when the API reports a province this table has no coordinates for. */
  place: ProvincePlace | null;
  region: RegionKey;
  visitorCount: number;
  level: DensityLevel;
  /** 1 = the most crowded province in the country. */
  rank: number;
  /** Share of the national visitor total, 0–1. */
  share: number;
  /** `visitorCount / max`, 0–1 — what the marker radius is scaled from. */
  intensity: number;
};

/**
 * Joins the API rows onto the province table and grades them.
 *
 * Bands are quintiles of the *national* set, not of whatever the reader has
 * filtered to, so "Sepi" means the same thing whether the map is showing all
 * of Indonesia or only Maluku. Quintiles rather than fixed cuts because the
 * counts are heavily skewed — Jawa Barat alone outweighs all of Papua.
 */
export function buildDensityPoints(entries: HeatmapEntry[]): DensityPoint[] {
  const rows = entries.filter((entry) => Number.isFinite(entry.visitor_count));
  if (rows.length === 0) return [];

  const counts = rows.map((row) => row.visitor_count).sort((a, b) => a - b);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const max = counts[counts.length - 1] || 1;

  const quantile = (p: number) =>
    counts[Math.min(counts.length - 1, Math.floor(p * counts.length))];
  const cuts = [quantile(0.2), quantile(0.4), quantile(0.6), quantile(0.8)];

  return rows
    .map((row) => {
      const place = PLACE_BY_CODE.get(row.province_code) ?? null;
      const level = cuts.filter((cut) => row.visitor_count > cut).length as DensityLevel;

      return {
        code: row.province_code,
        name: place?.name ?? row.province_name,
        place,
        region: place?.region ?? ("lainnya" as RegionKey),
        visitorCount: row.visitor_count,
        level,
        rank: 0,
        share: total > 0 ? row.visitor_count / total : 0,
        intensity: row.visitor_count / max,
      };
    })
    .sort((a, b) => b.visitorCount - a.visitorCount)
    .map((point, index) => ({ ...point, rank: index + 1 }));
}

/**
 * Marker radius in pixels — square-rooted so the *area* tracks the visitor
 * count. Pixels rather than metres so a province stays legible at every zoom.
 */
export function markerRadius(intensity: number): number {
  const MIN = 7;
  const MAX = 26;
  return MIN + Math.sqrt(Math.max(intensity, 0)) * (MAX - MIN);
}

const NUMBER_FORMAT = new Intl.NumberFormat("id-ID");

export function formatVisitors(count: number): string {
  return NUMBER_FORMAT.format(Math.round(count));
}

/** Compact form for the marker tooltips: 18,7 jt / 410 rb. */
export function formatVisitorsShort(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (count >= 1_000) return `${Math.round(count / 1_000)} rb`;
  return NUMBER_FORMAT.format(count);
}

export function formatShare(share: number): string {
  return `${(share * 100).toFixed(1).replace(".", ",")}%`;
}
