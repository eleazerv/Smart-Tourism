"use client";

/**
 * The Leaflet half of `/peta`. Loaded through `next/dynamic` with
 * `ssr: false` by `crowd-map-panel.tsx` — Leaflet touches `window` at import
 * time, so it can never run in the server render.
 *
 * Four layers, drawn bottom to top so the interactive ones stay clickable:
 *
 * 1. One `CircleMarker` per province, sized and graded by visitor count.
 *    Circles rather than a tile-baked heat layer: the API gives one number per
 *    province, so a dot per province says what the data knows and nothing more.
 *    They read as a wash under everything else — the crowding is context for
 *    the route, not a thing to click through.
 * 2. The route's dashed legs.
 * 3. One dot per city in the catalogue, added after the provinces so a click
 *    lands on the city rather than the province circle beneath it.
 * 4. The chosen stops, numbered in visiting order. Markers live in Leaflet's
 *    marker pane, which sits above every path.
 *
 * Leaflet is driven directly here rather than through `react-leaflet`, because
 * that library cannot survive React disconnecting and reconnecting effects —
 * which is exactly what the App Router does to a cached route on back/forward.
 * `MapContainer` builds its map inside a ref callback guarded by
 * `if (!mapInstanceRef.current)`, and its cleanup calls `map.remove()` without
 * clearing that ref. On reconnect the component instance, its refs and its DOM
 * node are all preserved, so the guard blocks rebuilding while every child
 * re-runs `addTo()` against the destroyed map — `getPane()` is gone by then and
 * the tile layer dies on `undefined.appendChild`. Owning the lifecycle means
 * the create-effect simply runs again and builds a fresh map into the same
 * div, which `Map.remove()` leaves reusable by deleting its `_leaflet_id`.
 */
import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DENSITY_LEVELS,
  NATIONAL_BOUNDS,
  formatVisitorsShort,
  markerRadius,
  type Bounds,
  type DensityPoint,
  type RegionKey,
} from "@/lib/heatmap-data";
import type { CityStop } from "@/lib/trip-data";
import { MAP_ATTRIBUTION, tileUrl } from "@/lib/map-tiles";

/**
 * Camera target. `token` changes whenever the map should actually move, so a
 * re-render for any other reason leaves the view where the reader put it.
 *
 * A region or a route is a box to fit; a single province is a point to fly to.
 */
export type Camera = { token: number } & (
  | { kind: "bounds"; bounds: Bounds }
  | { kind: "point"; lat: number; lng: number; zoom: number }
);

/** Keeps the archipelago in frame; panning past it has nothing to show. */
const MAX_BOUNDS: L.LatLngBoundsLiteral = [
  [-16, 90],
  [11, 145],
];

/** Breathing room around a fitted region, in pixels. */
const FIT_PADDING: L.PointTuple = [28, 28];

/** A one-stop route has no extent; without this the fit slams to max zoom. */
const FIT_MAX_ZOOM = 8;

/** Brand deep pine and glow mint — the trip planner's own colour, kept clear
 *  of the density ramp so the two layers never read as one. */
const PLANNER_LIGHT = "#19443C";
const PLANNER_DARK = "#aefffa";

const TOOLTIP_OPTIONS: L.TooltipOptions = {
  direction: "top",
  opacity: 1,
};

/** Province and city names come from the API and land in tooltip markup. */
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function tooltipHtml(title: string, detail: string): string {
  return `<span class="font-semibold">${escapeHtml(title)}</span><br />${escapeHtml(detail)}`;
}

export default function CrowdMapView({
  points,
  stops,
  trip,
  region,
  selectedCode,
  camera,
  theme,
  onSelect,
  onToggleStop,
  highlighted,
}: {
  points: DensityPoint[];
  stops: CityStop[];
  /** City ids, in visiting order. */
  trip: number[];
  /** Places outside this region stay on the map, dimmed for context. */
  region: RegionKey | "semua";
  selectedCode: string | null;
  camera: Camera;
  theme: "light" | "dark";
  onSelect: (code: string) => void;
  onToggleStop: (id: number) => void;
  /** City the reader is pointing at in the side panel, lit up here to tie the
   *  two together. */
  highlighted: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  /** Bumped whenever a new map exists, so every dependent effect re-runs. */
  const [generation, setGeneration] = useState(0);

  // Handlers change identity on every render of the parent. Reading them
  // through a ref keeps them out of the layer-building dependencies, so a
  // parent re-render does not tear down and rebuild the whole map.
  const handlers = useRef({ onSelect, onToggleStop });
  handlers.current = { onSelect, onToggleStop };

  /* ------------------------------------------------------------- map --- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      minZoom: 3,
      maxZoom: 9,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 0.7,
      // The map owns the whole screen now, so the wheel belongs to it.
      scrollWheelZoom: true,
      // Leaflet puts zoom top left by default, which is where the floating
      // toolbar sits.
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    map.fitBounds(NATIONAL_BOUNDS, { padding: FIT_PADDING });

    mapRef.current = map;
    setGeneration((current) => current + 1);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ----------------------------------------------------------- tiles --- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.tileLayer(tileUrl(theme), {
      attribution: MAP_ATTRIBUTION,
    }).addTo(map);

    return () => {
      layer.remove();
    };
  }, [generation, theme]);

  /* ---------------------------------------------------------- overlays --- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const dark = theme === "dark";
    // The selection ring has to read against the basemap, not against the fill.
    const selectedStroke = dark ? "#ffffff" : "#0f172a";
    // Deep pine / glow mint from the brand palette. Deliberately outside the
    // density ramp: its cool end ("Sangat sepi") is teal too, and a teal city
    // dot inside a teal province wash is unreadable over Papua and Maluku.
    const planner = dark ? PLANNER_DARK : PLANNER_LIGHT;
    const layers = L.layerGroup().addTo(map);

    // 1. Province crowding, first so it sits beneath everything else.
    for (const point of points) {
      if (!point.place) continue;

      const inRegion = region === "semua" || point.region === region;
      const isSelected = point.code === selectedCode;
      const level = DENSITY_LEVELS[point.level];

      L.circleMarker([point.place.lat, point.place.lng], {
        radius: markerRadius(point.intensity),
        color: isSelected ? selectedStroke : level.color,
        weight: isSelected ? 3 : 1,
        opacity: inRegion ? 1 : 0.25,
        fillColor: level.color,
        // Lighter than the city dots on purpose: this layer is the backdrop.
        fillOpacity: isSelected ? 0.8 : inRegion ? 0.5 : 0.1,
      })
        .bindTooltip(
          tooltipHtml(
            point.name,
            `${formatVisitorsShort(point.visitorCount)} pengunjung · ${level.label}`,
          ),
          { ...TOOLTIP_OPTIONS, offset: [0, -4] },
        )
        .on("click", () => handlers.current.onSelect(point.code))
        .addTo(layers);
    }

    const stopById = new Map(stops.map((stop) => [stop.id, stop]));
    const route = trip
      .map((id) => stopById.get(id))
      .filter((stop): stop is CityStop => Boolean(stop));

    // 2. Legs go in before the stops so a line arriving at one never covers it.
    if (route.length > 1) {
      L.polyline(
        route.map((stop) => [stop.lat, stop.lng] as L.LatLngTuple),
        {
          color: planner,
          weight: 3,
          opacity: 0.9,
          dashArray: "8 8",
        },
      ).addTo(layers);
    }

    // 3. Cities.
    for (const stop of stops) {
      // A chosen stop is drawn as a numbered pin instead.
      if (trip.includes(stop.id)) continue;

      const inRegion = region === "semua" || stop.region === region;
      const lit = stop.id === highlighted;

      L.circleMarker([stop.lat, stop.lng], {
        radius: lit ? 11 : 8,
        color: lit ? selectedStroke : dark ? "#042f2e" : "#ffffff",
        weight: lit ? 3 : 2,
        opacity: inRegion || lit ? 1 : 0.3,
        fillColor: planner,
        fillOpacity: inRegion || lit ? 1 : 0.25,
      })
        .bindTooltip(
          tooltipHtml(stop.name, `${stop.total} destinasi · klik untuk tambah`),
          { ...TOOLTIP_OPTIONS, offset: [0, -6] },
        )
        .on("click", () => handlers.current.onToggleStop(stop.id))
        .addTo(layers);
    }

    // 4. The itinerary itself.
    route.forEach((stop, index) => {
      const lit = stop.id === highlighted;

      L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: "crowd-map-pin-icon",
          html: `<span class="crowd-map-pin${lit ? " crowd-map-pin--lit" : ""}">${index + 1}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      })
        .bindTooltip(
          tooltipHtml(`${index + 1}. ${stop.name}`, "Klik untuk hapus dari rute"),
          { ...TOOLTIP_OPTIONS, offset: [0, -16] },
        )
        .on("click", () => handlers.current.onToggleStop(stop.id))
        .addTo(layers);
    });

    return () => {
      layers.remove();
    };
  }, [
    generation,
    points,
    stops,
    trip,
    region,
    selectedCode,
    highlighted,
    theme,
  ]);

  /* ----------------------------------------------------------- camera --- */

  // Only the token decides when to move; the target rides along with it, so a
  // marker click can highlight a province without yanking the view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (camera.kind === "bounds") {
      map.flyToBounds(camera.bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        duration: 0.9,
      });
    } else {
      map.flyTo([camera.lat, camera.lng], camera.zoom, { duration: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation, camera.token]);

  return <div ref={containerRef} className="crowd-map map-surface h-full w-full bg-muted" />;
}
