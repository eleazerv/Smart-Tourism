/**
 * Presentation helpers for the destination detail page.
 *
 * Everything here is derived from what the API actually returns — no invented
 * prices, opening hours, or itineraries. Where the guide needs an image the
 * database has no column for, it falls back to the same deterministic
 * placeholder the home page uses.
 */
import type { Destination, HeatmapEntry } from "@/lib/api";
import { coverImage, photo } from "@/lib/home-data";

export const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/**
 * "April–Oktober" out of a set of month numbers (1–12), joining runs that wrap
 * past December — Indonesia's wet season is November–Maret, which reads as two
 * broken stretches if the year boundary is treated as a wall.
 */
export function monthRangeLabel(months: number[]): string {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 12) return "Sepanjang tahun";

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
      ? MONTHS[run[0] - 1]
      : `${MONTHS[run[0] - 1]}–${MONTHS[run[run.length - 1] - 1]}`,
  );

  // "Januari dan Maret dan Mei" -> "Januari, Maret, dan Mei".
  if (labels.length <= 2) return labels.join(" dan ");
  return `${labels.slice(0, -1).join(", ")}, dan ${labels.at(-1)}`;
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

export function formatCount(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("id-ID");
}

/** Human label for a rating, in the register booking sites use. frontend-lele */ 
// export function ratingLabel(value: number) {
//   if (value >= 4.5) return "Istimewa";
//   if (value >= 4) return "Sangat baik";
//   if (value >= 3.5) return "Baik";
//   if (value >= 3) return "Cukup";
//   return "Biasa";
// }

export type CrowdLevel = {
  label: string;
  description: string;
  /** 0–100, this province's share of the busiest province on record. */
  share: number;
  tone: "quiet" | "moderate" | "busy";
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

  if (share >= 60) {
    return {
      label: "Ramai",
      description: `${entry.province_name} termasuk provinsi terpadat pada periode terakhir.`,
      share,
      tone: "busy",
    };
  }
  if (share >= 25) {
    return {
      label: "Sedang",
      description: `Kunjungan ke ${entry.province_name} berada di tengah dibanding provinsi lain.`,
      share,
      tone: "moderate",
    };
  }
  return {
    label: "Sepi",
    description: `${entry.province_name} relatif lengang dibanding provinsi terpadat.`,
    share,
    tone: "quiet",
  };
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

export function formatCoordinates(lat: number, lng: number) {
  const ns = lat >= 0 ? "LU" : "LS";
  const ew = lng >= 0 ? "BT" : "BB";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "3 hari lalu" style stamp for review cards. */
export function relativeDate(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";

  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}
