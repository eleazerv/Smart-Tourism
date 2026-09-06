"use client";

/**
 * Interactive shell around the map that *is* `/peta`.
 *
 * Crowding and the trip planner share one canvas: the province wash says which
 * regions are busy, the city dots on top are the stops you string into a route.
 * Reading the first and acting on the second is one continuous move, so
 * splitting them across modes only made the reader toggle back and forth.
 *
 * The map runs edge to edge and owns the whole screen; the region filter and
 * the legend float over it, and the panel is docked solid down the right.
 * Below `lg` that inverts — the page scrolls, the map takes a slice of the
 * viewport, and the panel follows underneath.
 *
 * The map itself is a separate chunk (`crowd-map-view.tsx`) pulled in with
 * `ssr: false`; everything here renders on the server too, so the summary and
 * the itinerary stay readable before Leaflet has downloaded — and if it never
 * does.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  MousePointerClick,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  DENSITY_COLORS,
  NATIONAL_BOUNDS,
  REGIONS,
  formatShare,
  formatVisitors,
  regionBounds,
  type Bounds,
  type DensityPoint,
  type RegionKey,
} from "@/lib/heatmap-data";
import { formatKm, routeDistanceKm, type CityStop } from "@/lib/trip-data";
import { Rating } from "@/components/home/rating";
import { cn } from "@/lib/utils";
import type { Camera } from "@/components/peta/crowd-map-view";
import { useLocale, useTranslations } from "next-intl";

const CrowdMapView = dynamic(() => import("@/components/peta/crowd-map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted">
      <span className="text-sm text-muted-foreground">Memuat peta…</span>
    </div>
  ),
});

/** Where a half-built itinerary survives a reload. */
const TRIP_STORAGE_KEY = "smart-tourism:trip";

type Filter = RegionKey | "semua";

/** Smallest box containing every stop, for fitting the camera to a route. */
function boundsOfStops(stops: CityStop[]): Bounds {
  const lats = stops.map((stop) => stop.lat);
  const lngs = stops.map((stop) => stop.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function CrowdMapPanel({
  points,
  stops,
}: {
  points: DensityPoint[];
  stops: CityStop[];
}) {
  const t = useTranslations("map");

  const [region, setRegion] = useState<Filter>("semua");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  /** City ids, in visiting order. */
  const [trip, setTrip] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  /** City the reader is pointing at in one of the lists. */
  const [hovered, setHovered] = useState<number | null>(null);
  const [camera, setCamera] = useState<Camera>({
    kind: "bounds",
    bounds: NATIONAL_BOUNDS,
    token: 0,
  });


  // The itinerary outlives a reload. Restoring has to happen after mount —
  // reading storage during render would not match the server's empty trip.
  const restored = useRef(false);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        window.localStorage.getItem(TRIP_STORAGE_KEY) ?? "[]",
      );
      if (Array.isArray(saved)) {
        // Drop ids the catalogue no longer has, so a stale plan cannot
        // resurrect a city that is gone.
        const known = new Set(stops.map((stop) => stop.id));
        setTrip(saved.filter((id) => typeof id === "number" && known.has(id)));
      }
    } catch {
      // Private mode, or a corrupt value. Start with an empty plan.
    }
    restored.current = true;
    // Restoring is a mount-time job; `stops` is server data and does not
    // change for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip));
    } catch {
      // Storage full or blocked — the plan just will not survive a reload.
    }
  }, [trip]);

  /** Only offer a region the data actually covers. */
  const regions = useMemo(
    () =>
      REGIONS.filter(
        (entry) =>
          entry.key === "semua" ||
          points.some((point) => point.region === entry.key) ||
          stops.some((stop) => stop.region === entry.key),
      ),
    [points, stops],
  );

  const visible = useMemo(
    () =>
      region === "semua"
        ? points
        : points.filter((point) => point.region === region),
    [points, region],
  );

  const routeStops = useMemo(() => {
    const byId = new Map(stops.map((stop) => [stop.id, stop]));
    return trip
      .map((id) => byId.get(id))
      .filter((stop): stop is CityStop => Boolean(stop));
  }, [stops, trip]);

  const selected = points.find((point) => point.code === selectedCode) ?? null;
  const regionTotal = visible.reduce((sum, point) => sum + point.visitorCount, 0);
  // `points` arrives sorted by visitor count, descending.
  const busiest = visible[0] ?? null;
  const quietest = visible[visible.length - 1] ?? null;

  function moveCamera(bounds: Bounds) {
    setCamera((current) => ({
      kind: "bounds",
      bounds,
      token: current.token + 1,
    }));
  }

  function pickRegion(next: Filter) {
    setRegion(next);
    setSelectedCode(null);
    moveCamera(regionBounds(next));
  }

  /** Toggles the detail card. The camera stays put — a click on the map means
   *  the reader is already looking at the province they picked. */
  function pickProvince(code: string) {
    setSelectedCode((current) => (current === code ? null : code));
  }

  /**
   * A new stop joins the end of the itinerary; picking it again drops it.
   *
   * `fromList` moves the camera afterwards: a city added from the side panel
   * may be nowhere near the current view, whereas one clicked on the map is
   * already in front of the reader.
   */
  function toggleStop(id: number, fromList = false) {
    const next = trip.includes(id)
      ? trip.filter((stop) => stop !== id)
      : [...trip, id];
    setTrip(next);

    if (!fromList) return;
    const byId = new Map(stops.map((stop) => [stop.id, stop]));
    const route = next
      .map((stopId) => byId.get(stopId))
      .filter((stop): stop is CityStop => Boolean(stop));
    if (route.length > 0) moveCamera(boundsOfStops(route));
  }

  function moveStop(index: number, delta: number) {
    setTrip((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
      <div className="relative h-[60vh] min-h-[20rem] shrink-0 lg:h-full lg:min-h-0 lg:flex-1">
        <CrowdMapView
          points={points}
          stops={stops}
          trip={trip}
          region={region}
          selectedCode={selectedCode}
          camera={camera}
          onSelect={pickProvince}
          onToggleStop={toggleStop}
          highlighted={hovered}
        />

        {/* Floating chrome. Leaflet's own panes sit at z-index 1000, so these
            have to clear it; `pointer-events-none` on the wrappers keeps the
            map draggable everywhere the controls are not. The right edge is
            left free for Leaflet's zoom buttons. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] flex flex-wrap items-center gap-2 p-3 pr-14">
          {/* Region filter. Picking one fits the map to that island group and
              re-scopes the panel, so "paling sepi" can be read per region
              rather than only nationally. */}
          <div className="no-scrollbar pointer-events-auto flex max-w-full gap-2 overflow-x-auto">
            {regions.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => pickRegion(entry.key)}
                aria-pressed={region === entry.key}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                  region === entry.key
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-background hover:bg-brand-tint/10",
                )}
              >
                {t(`region.${entry.key}`)}
              </button>
            ))}
          </div>

          {routeStops.length > 0 && (
            <p className="pointer-events-auto whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {t("stopCount", { count: routeStops.length })} ·{" "}
              {formatKm(routeDistanceKm(routeStops))}
            </p>
          )}
        </div>

        {/* Legend. The second row explains the layer sitting on top of the
            provinces. Since the crowding moved from sized circles to filled
            regions, colour is the only channel carrying it — noted here
            because that makes the bands the sole cue for anyone who cannot
            separate the hues. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100] p-3 pr-24">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-1 rounded-2xl border border-border bg-background px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {DENSITY_COLORS.map((color, index) => (
                <span
                  key={color}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {t(`density.${index}`)}
                </span>
              ))}
              <span className="text-xs text-muted-foreground">
                {t("legendNote")}
              </span>
            </div>

            <p className="flex items-center gap-1.5 border-t border-border pt-1 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background bg-brand-700"
              />
              {t("cityDot")}
            </p>
          </div>
        </div>
      </div>

      {/* Docked panel. On a wide screen it owns the scroll; below `lg` it just
          follows the map down the page. Crowding first, because which province
          is quiet is what decides the stops underneath it. */}
      <aside className="no-scrollbar min-h-0 w-full shrink-0 space-y-3 border-border bg-background p-4 lg:h-full lg:w-[22rem] lg:overflow-y-auto lg:border-l">
        {selected ? (
          <ProvinceCard point={selected} total={points.length} />
        ) : (
          <SummaryCard
            label={t(`region.${region}`)}
            provinces={visible.length}
            total={regionTotal}
            busiest={busiest}
            quietest={quietest}
          />
        )}

        <TripCard
          stops={routeStops}
          onMove={moveStop}
          onRemove={toggleStop}
          onClear={() => setTrip([])}
          onFit={() => moveCamera(boundsOfStops(routeStops))}
          onHover={setHovered}
        />

        <StopPicker
          stops={stops}
          trip={trip}
          region={region}
          query={query}
          onQuery={setQuery}
          onToggle={(id) => toggleStop(id, true)}
          onHover={setHovered}
        />

        {routeStops.map((stop, index) => (
          <StopRecommendations key={stop.id} stop={stop} order={index + 1} />
        ))}
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- planner --- */

function TripCard({
  stops,
  onMove,
  onRemove,
  onClear,
  onFit,
  onHover,
}: {
  stops: CityStop[];
  onMove: (index: number, delta: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onFit: () => void;
  /** Pointing at a row lights the matching pin up on the map. */
  onHover: (id: number | null) => void;
}) {
  const t = useTranslations("map");

  if (stops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold">{t("tripHeading")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("tripEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("tripHeading")}</h3>
        <span className="text-xs text-muted-foreground">
          {t("stopCount", { count: stops.length })}
        </span>
      </div>

      <ol className="mt-3 space-y-1">
        {stops.map((stop, index) => (
          <li
            key={stop.id}
            onMouseEnter={() => onHover(stop.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(stop.id)}
            onBlur={() => onHover(null)}
            className="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-brand-tint/10"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {stop.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {stop.provinceName}
              </span>
            </span>
            <span className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                aria-label={t("moveUp", { name: stop.name })}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-brand-tint/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === stops.length - 1}
                aria-label={t("moveDown", { name: stop.name })}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-brand-tint/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(stop.id)}
                aria-label={t("removeStop", { name: stop.name })}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Jarak rute</span>
        <span className="font-medium tabular-nums">
          {formatKm(routeDistanceKm(stops))}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Garis lurus antartitik, bukan jarak tempuh jalan.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onFit}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-brand-tint/10"
        >
          <MapPin className="h-3.5 w-3.5" />
          {t("fitRoute")}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("clearRoute")}
        </button>
      </div>
    </div>
  );
}

function StopRecommendations({
  stop,
  order,
}: {
  stop: CityStop;
  order: number;
}) {
  const t = useTranslations("map");

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
          {order}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{stop.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {stop.provinceName} · {t("destinationCount", { count: stop.total })}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {stop.highlights.map((highlight) => (
          <li key={highlight.id}>
            <Link
              href={`/destinations/${highlight.id}`}
              className="group block rounded-lg px-1 py-1 transition hover:bg-brand-tint/10"
            >
              <span className="flex items-center gap-1 text-sm font-medium">
                <span className="truncate">{highlight.name}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
              </span>
              {/* Most rows are still unreviewed, so the category stands in
                  rather than a misleading 0,0 rating. */}
              {highlight.rating > 0 ? (
                <Rating value={highlight.rating} className="mt-0.5" />
              ) : (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {highlight.category ?? t("noReviews")}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {stop.total > stop.highlights.length && (
        // `q` matches the city name, which is how the catalogue search finds
        // everything filed under one city.
        <Link
          href={`/destinations?q=${encodeURIComponent(stop.name)}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          {t("seeAllIn", { count: stop.total })}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/**
 * The other way into the itinerary. Clicking dots on the map is fine once you
 * know where a city is, but the dots are small, several overlap (three of them
 * sit on Bali alone), and on a phone half the country is off-screen — so the
 * full list is searchable here.
 */
function StopPicker({
  stops,
  trip,
  region,
  query,
  onQuery,
  onToggle,
  onHover,
}: {
  stops: CityStop[];
  trip: number[];
  region: Filter;
  query: string;
  onQuery: (value: string) => void;
  onToggle: (id: number) => void;
  onHover: (id: number | null) => void;
}) {
  const t = useTranslations("map");

  const needle = query.trim().toLowerCase();
  const matches = stops.filter((stop) => {
    if (region !== "semua" && stop.region !== region) return false;
    if (!needle) return true;
    return (
      stop.name.toLowerCase().includes(needle) ||
      stop.provinceName.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("addStop")}</h3>
        <span className="text-xs text-muted-foreground">
          {t("cityCount", { count: matches.length })}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/20">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <label htmlFor="trip-city-search" className="sr-only">
          {t("searchCityLabel")}
        </label>
        <input
          id="trip-city-search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("searchCityPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label={t("clearSearch")}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("noCityMatch")}
        </p>
      ) : (
        <ul className="no-scrollbar mt-2 max-h-64 space-y-0.5 overflow-y-auto">
          {matches.map((stop) => {
            const order = trip.indexOf(stop.id);
            const chosen = order >= 0;

            return (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => onToggle(stop.id)}
                  onMouseEnter={() => onHover(stop.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(stop.id)}
                  onBlur={() => onHover(null)}
                  aria-pressed={chosen}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-brand-tint/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {stop.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {stop.provinceName} ·{" "}
                      {t("destinationCount", { count: stop.total })}
                    </span>
                  </span>
                  {chosen ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
                      {order + 1}
                    </span>
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- density --- */

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
  const t = useTranslations("map");
  const locale = useLocale();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">
        {formatVisitors(total, locale)}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("visitsFrom", { count: provinces })}
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
        {t("clickHint")}
      </p>
    </div>
  );
}

function ProvinceCard({ point, total }: { point: DensityPoint; total: number }) {
  const t = useTranslations("map");
  const locale = useLocale();
  const color = DENSITY_COLORS[point.level];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {t(`region.${point.region}`)}
      </p>
      <h3 className="mt-1 font-display text-lg font-bold leading-tight">
        {point.name}
      </h3>

      <span
        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {t(`density.${point.level}`)}
      </span>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(`densityBlurb.${point.level}`)}
      </p>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t("visitors")}</dt>
          <dd className="font-medium tabular-nums">
            {formatVisitors(point.visitorCount, locale)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t("rank")}</dt>
          <dd className="font-medium tabular-nums">
            {t("rankOf", { rank: point.rank, total })}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{t("nationalShare")}</dt>
          <dd className="font-medium tabular-nums">
            {formatShare(point.share, locale)}
          </dd>
        </div>
      </dl>

      {point.place && (
        <Link
          href={`/destinations?province_id=${point.place.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          {t("seeDestinationsHere")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
