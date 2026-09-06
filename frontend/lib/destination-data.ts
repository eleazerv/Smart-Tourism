/**
 * Presentation helpers for the destination detail page.
 *
 * Everything here is derived from what the API actually returns — no invented
 * prices, opening hours, or itineraries. Where the guide needs an image the
 * database has no column for, it falls back to the same deterministic
 * placeholder the home page uses.
 *
 * Setiap fungsi yang menghasilkan teks menerima `locale`. Yang tidak bisa
 * disusun `Intl` — label kepadatan, stempel waktu relatif — mengembalikan
 * kunci, bukan kalimat, dan komponen pemanggilnya yang menerjemahkan.
 */
import type { Destination, HeatmapEntry } from "@/lib/api";
import { coverImage, photo } from "@/lib/home-data";
import { formatNumber, intlLocale, joinList, monthName } from "@/lib/intl";

/**
 * "April–Oktober" out of a set of month numbers (1–12), joining runs that wrap
 * past December — Indonesia's wet season is November–Maret, which reads as two
 * broken stretches if the year boundary is treated as a wall.
 *
 * `null` berarti dua belas bulan sekaligus; pemanggilnya yang memilih kata
 * "sepanjang tahun" dalam bahasanya.
 */
export function monthRangeLabel(
  months: number[],
  locale: string,
): string | null {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 12) return null;

  const runs: number[][] = [];
  for (const month of sorted) {
    const last = runs[runs.length - 1];
    if (last && month === last[last.length - 1] + 1) last.push(month);
    else runs.push([month]);
  }

  // Desember bersambung ke Januari: gabungkan run terakhir ke run pertama.
  if (
    runs.length > 1 &&
    runs[runs.length - 1].at(-1) === 12 &&
    runs[0][0] === 1
  ) {
    runs[0] = [...runs.pop()!, ...runs[0]];
  }

  const labels = runs.map((run) =>
    run.length === 1
      ? monthName(run[0], locale)
      : `${monthName(run[0], locale)}–${monthName(run[run.length - 1], locale)}`,
  );

  return joinList(labels, locale);
}

/** Number of frames in the hero gallery, cover included. */
const GALLERY_SIZE = 5;

/**
 * Hero gallery frames. Only the first is real — `cover_image_url` — so the
 * rest are stable placeholders keyed by the destination's own name, which
 * keeps the layout honest about being a gallery without inventing photos that
 * change on every render.
 */
export function gallery(destination: Destination): string[] {
  return [
    coverImage(destination, 1200, 800),
    ...Array.from({ length: GALLERY_SIZE - 1 }, (_, i) =>
      photo(`${destination.name}-${i + 2}`, 600, 400),
    ),
  ];
}

export function formatCount(value: number | null | undefined, locale: string) {
  return formatNumber(value, locale);
}

export type CrowdTone = "quiet" | "moderate" | "busy";

export type CrowdLevel = {
  /** Kunci di namespace `crowd`, bukan label jadi. */
  tone: CrowdTone;
  /** Nama provinsi, untuk disisipkan ke kalimat penjelasnya. */
  provinceName: string;
  /** 0–100, this province's share of the busiest province on record. */
  share: number;
};

/**
 * Where the destination's province sits in the latest visitor statistics,
 * expressed relative to the busiest province rather than as an absolute count
 * — the raw BPS numbers mean little without that comparison.
 */
export function crowdLevel(
  provinceCode: string | null | undefined,
  heatmap: HeatmapEntry[],
): CrowdLevel | null {
  if (!provinceCode || heatmap.length === 0) return null;

  const entry = heatmap.find((row) => row.province_code === provinceCode);
  if (!entry) return null;

  const busiest = Math.max(...heatmap.map((row) => row.visitor_count));
  if (busiest <= 0) return null;

  const share = Math.round((entry.visitor_count / busiest) * 100);
  const tone: CrowdTone = share >= 60 ? "busy" : share >= 25 ? "moderate" : "quiet";

  return { tone, provinceName: entry.province_name, share };
}

/** Google Maps deep link — the app has no map tiles of its own yet. */
export function mapsUrl(destination: {
  name: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const query =
    destination.latitude !== null && destination.longitude !== null
      ? `${destination.latitude},${destination.longitude}`
      : destination.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Arah mata angin ikut bahasanya: LU/LS/BT/BB dalam bahasa Indonesia,
 * N/S/E/W dalam bahasa Inggris.
 */
export function formatCoordinates(lat: number, lng: number, locale: string) {
  const en = locale === "en";
  const ns = lat >= 0 ? (en ? "N" : "LU") : en ? "S" : "LS";
  const ew = lng >= 0 ? (en ? "E" : "BT") : en ? "W" : "BB";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type RelativeStamp =
  | { unit: "today" | "yesterday" }
  | { unit: "day" | "month" | "year"; value: number };

/**
 * Umur sebuah ulasan, dalam bentuk yang belum jadi kalimat.
 *
 * Bentuk jamak berbeda antar bahasa ("1 hari" vs "1 day", "2 hari" vs
 * "2 days"), jadi angkanya diserahkan ke ICU di sisi kamus alih-alih
 * dirangkai di sini.
 */
export function relativeStamp(value: string): RelativeStamp | null {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return { unit: "today" };
  if (days === 1) return { unit: "yesterday" };
  if (days < 30) return { unit: "day", value: days };
  if (days < 365) return { unit: "month", value: Math.floor(days / 30) };
  return { unit: "year", value: Math.floor(days / 365) };
}
