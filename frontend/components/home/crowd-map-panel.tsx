"use client";

/**
 * Interactive shell around the crowd map: the region filter, the legend, and
 * the ranking panel that answers the actual question — which provinces are
 * *not* busy right now.
 *
 * The map itself is a separate chunk (`crowd-map-view.tsx`) pulled in with
 * `ssr: false`; everything here renders on the server too, so the ranking is
 * readable before Leaflet has downloaded — and if it never does.
 */
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, MapPin, MousePointerClick } from "lucide-react";
import {
  DENSITY_LEVELS,
  NATIONAL_BOUNDS,
  REGIONS,
  formatShare,
  formatVisitors,
  regionBounds,
  regionLabel,
  type DensityPoint,
  type RegionKey,
} from "@/lib/heatmap-data";
import { cn } from "@/lib/utils";
import type { Camera } from "@/components/home/crowd-map-view";

const CrowdMapView = dynamic(() => import("@/components/home/crowd-map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted">
      <span className="text-sm text-muted-foreground">Memuat peta…</span>
    </div>
  ),
});

type Filter = RegionKey | "semua";

export function CrowdMapPanel({ points }: { points: DensityPoint[] }) {
  const [region, setRegion] = useState<Filter>("semua");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({
    kind: "bounds",
    bounds: NATIONAL_BOUNDS,
    token: 0,
  });

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  /** Only offer a region the data actually covers. */
  const regions = useMemo(
    () =>
      REGIONS.filter(
        (entry) =>
          entry.key === "semua" ||
          points.some((point) => point.region === entry.key),
      ),
    [points],
  );

  const visible = useMemo(
    () =>
      region === "semua"
        ? points
        : points.filter((point) => point.region === region),
    [points, region],
  );

  const selected = points.find((point) => point.code === selectedCode) ?? null;
  const regionTotal = visible.reduce((sum, point) => sum + point.visitorCount, 0);
  // `points` arrives sorted by visitor count, descending.
  const busiest = visible[0] ?? null;
  const quietest = visible[visible.length - 1] ?? null;

  function pickRegion(next: Filter) {
    setRegion(next);
    setSelectedCode(null);
    setCamera((current) => ({
      kind: "bounds",
      bounds: regionBounds(next),
      token: current.token + 1,
    }));
  }

  /** Toggles the detail card. The camera stays put — a click on the map means
   *  the reader is already looking at the province they picked. */
  function pickProvince(code: string) {
    setSelectedCode((current) => (current === code ? null : code));
  }

  return (
    <div className="space-y-4">
      {/* Region filter. Picking one fits the map to that island group and
          re-scopes the summary, so "paling sepi" can be read per region
          rather than only nationally. */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {regions.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => pickRegion(entry.key)}
            aria-pressed={region === entry.key}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
              region === entry.key
                ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                : "border-border hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <div className="h-[340px] overflow-hidden rounded-2xl border border-border sm:h-[440px] lg:h-[480px]">
            <CrowdMapView
              points={points}
              region={region}
              selectedCode={selectedCode}
              camera={camera}
              theme={theme}
              onSelect={pickProvince}
            />
          </div>

          {/* Legend. Size carries the same information as colour, so the bands
              stay readable for anyone who cannot separate the hues. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {DENSITY_LEVELS.map((level) => (
              <span
                key={level.label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: level.color }}
                />
                {level.label}
              </span>
            ))}
            <span className="text-xs text-muted-foreground">
              Ukuran titik = jumlah pengunjung
            </span>
          </div>
        </div>

        <aside>
          {selected ? (
            <ProvinceCard point={selected} total={points.length} />
          ) : (
            <SummaryCard
              label={regionLabel(region)}
              provinces={visible.length}
              total={regionTotal}
              busiest={busiest}
              quietest={quietest}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  provinces,
  total,
  busiest,
  quietest,
}: {
  label: string;
  provinces: number;
  total: number;
  busiest: DensityPoint | null;
  quietest: DensityPoint | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
        {formatVisitors(total)}
      </p>
      <p className="text-xs text-muted-foreground">
        kunjungan dari {provinces} provinsi
      </p>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        {busiest && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Paling ramai</dt>
            <dd className="truncate font-medium">{busiest.name}</dd>
          </div>
        )}
        {quietest && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Paling sepi</dt>
            <dd className="truncate font-medium">{quietest.name}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Klik titik di peta untuk melihat rincian satu provinsi.
      </p>
    </div>
  );
}

function ProvinceCard({ point, total }: { point: DensityPoint; total: number }) {
  const level = DENSITY_LEVELS[point.level];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {regionLabel(point.region)}
      </p>
      <h3 className="mt-1 font-display text-lg font-bold leading-tight">
        {point.name}
      </h3>

      <span
        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ backgroundColor: `${level.color}26`, color: level.color }}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: level.color }}
        />
        {level.label}
      </span>
      <p className="mt-1 text-xs text-muted-foreground">{level.blurb}</p>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Pengunjung</dt>
          <dd className="font-medium tabular-nums">
            {formatVisitors(point.visitorCount)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Peringkat</dt>
          <dd className="font-medium tabular-nums">
            #{point.rank} dari {total}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Porsi nasional</dt>
          <dd className="font-medium tabular-nums">{formatShare(point.share)}</dd>
        </div>
      </dl>

      {point.place && (
        <Link
          href={`/destinations?province_id=${point.place.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-100"
        >
          Lihat destinasi di sini
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
