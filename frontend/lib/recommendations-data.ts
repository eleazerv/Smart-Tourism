/**
 * URL state and derivations for `/recommendations` — the "kapan waktu terbaik
 * berkunjung" page.
 *
 * Everything here reads from two Express routes and nothing else:
 * `GET /api/recommendations` supplies the climate pattern per province plus
 * the month's destination picks, and `GET /api/heatmap` supplies how busy each
 * province was on the last period on record. Season answers *when the weather
 * is right*; the heatmap answers *when it is not crowded*. The page is the
 * intersection.
 */
import type { HeatmapEntry, SeasonInfo } from "@/lib/api";
import { crowdLevel, type CrowdLevel } from "@/lib/destination-data";
import type { RawSearchParams } from "@/lib/destinations-search";

export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? "bulan ini";
}

/* ----------------------------------------------------------- url state --- */

export type TimingState = {
  /** 1–12. Defaults to the current month, which is also the API's default. */
  month: number;
  /** `provinces.id`, not the BPS code — that is what the API filters on. */
  provinceId: number | null;
};

export function parseTiming(params: RawSearchParams): TimingState {
  const raw = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = Number(raw);
  const rawProvince = Array.isArray(params.province_id)
    ? params.province_id[0]
    : params.province_id;
  const provinceId = Number(rawProvince);

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : new Date().getMonth() + 1,
    provinceId:
      Number.isFinite(provinceId) && provinceId > 0 ? provinceId : null,
  };
}

/** `/recommendations?…` with `patch` applied, omitting anything at its default. */
export function timingHref(
  state: TimingState,
  patch: Partial<TimingState> = {},
): string {
  const next = { ...state, ...patch };
  const params = new URLSearchParams();
  params.set("month", String(next.month));
  if (next.provinceId !== null) {
    params.set("province_id", String(next.provinceId));
  }
  return `/recommendations?${params}`;
}

/* -------------------------------------------------------------- seasons --- */

/** "kemarau" → "Kemarau". The API stores these lowercase. */
export function seasonLabel(season: string): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/** Dry season is the travel-friendly one; wet is the caveat. */
export function isDrySeason(season: string): boolean {
  return season.toLowerCase() === "kemarau";
}

export type SeasonGroup = {
  season: string;
  entries: SeasonInfo[];
};

/** Provinces bucketed by season, driest first, each bucket sorted by name. */
export function groupBySeason(info: SeasonInfo[]): SeasonGroup[] {
  const buckets = new Map<string, SeasonInfo[]>();
  for (const entry of info) {
    const rows = buckets.get(entry.season);
    if (rows) rows.push(entry);
    else buckets.set(entry.season, [entry]);
  }

  return [...buckets.entries()]
    .map(([season, entries]) => ({
      season,
      entries: entries.sort((a, b) =>
        a.province.name.localeCompare(b.province.name, "id"),
      ),
    }))
    .sort((a, b) => Number(isDrySeason(b.season)) - Number(isDrySeason(a.season)));
}

/** The season most provinces are in this month, for one-line summaries. */
export function dominantSeason(info: SeasonInfo[]): string | null {
  const groups = groupBySeason(info);
  if (groups.length === 0) return null;
  return [...groups].sort((a, b) => b.entries.length - a.entries.length)[0]
    .season;
}

/* --------------------------------------------------------------- timing --- */

export type ProvinceTiming = {
  info: SeasonInfo;
  /** Null when the province is missing from the latest visitor statistics. */
  crowd: CrowdLevel | null;
  visitors: number | null;
};

/**
 * Joins each province's climate pattern to its crowding.
 *
 * The heatmap is keyed by BPS code while the climate rows carry it as
 * `province.code`, so the two line up directly.
 */
export function withCrowding(
  info: SeasonInfo[],
  heatmap: HeatmapEntry[],
): ProvinceTiming[] {
  return info.map((entry) => {
    const row = heatmap.find(
      (item) => item.province_code === entry.province.code,
    );
    return {
      info: entry,
      crowd: crowdLevel(entry.province.code, heatmap),
      visitors: row?.visitor_count ?? null,
    };
  });
}

/**
 * The page's actual answer: provinces whose weather is good *and* whose
 * visitor numbers are low, quietest first.
 *
 * Provinces in the wet season are dropped rather than ranked low — an empty
 * beach in a storm is not a recommendation. Provinces missing from the
 * heatmap are dropped too, since "quiet" would be a guess.
 */
export function rankQuietAndDry(timings: ProvinceTiming[]): ProvinceTiming[] {
  return timings
    .filter(
      (timing) =>
        isDrySeason(timing.info.season) && timing.visitors !== null,
    )
    .sort((a, b) => (a.visitors ?? 0) - (b.visitors ?? 0));
}

/**
 * Months the province is in the dry season, from a year's worth of climate
 * rows keyed by month.
 *
 * The season board answers "where should I go in September". This answers the
 * question a reader asks the moment they pick a province and find it raining:
 * "then when *should* I come".
 */
export function drySeasonMonths(byMonth: Map<number, string>): number[] {
  return [...byMonth.entries()]
    .filter(([, season]) => isDrySeason(season))
    .map(([month]) => month)
    .sort((a, b) => a - b);
}

/**
 * Nearest month from `from` (inclusive) that appears in `months`, wrapping
 * past December — the reader is standing in one month and wants the next
 * chance, not the lowest-numbered one.
 */
export function nextMonthIn(months: number[], from: number): number | null {
  if (months.length === 0) return null;
  const set = new Set(months);
  for (let step = 0; step < 12; step += 1) {
    const month = ((from - 1 + step) % 12) + 1;
    if (set.has(month)) return month;
  }
  return null;
}

/** Activity slugs read better as a sentence than as chips repeated per card. */
export function formatActivities(activities: string[]): string {
  if (activities.length === 0) return "";
  if (activities.length === 1) return activities[0];
  return `${activities.slice(0, -1).join(", ")} dan ${activities.at(-1)}`;
}
