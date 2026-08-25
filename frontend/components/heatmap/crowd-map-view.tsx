"use client";

/**
 * The Leaflet half of `/heatmap`. Loaded through `next/dynamic` with
 * `ssr: false` by `crowd-map-panel.tsx` — Leaflet touches `window` at import
 * time, so it can never run in the server render.
 *
 * Two layers, one per mode:
 *
 * - `kepadatan` — one `CircleMarker` per province, sized and graded by visitor
 *   count. Circles rather than a tile-baked heat layer: the API gives one
 *   number per province, so a dot per province says what the data knows and
 *   nothing more.
 * - `rencana` — one dot per city in the catalogue, with the chosen stops
 *   numbered in visiting order and joined by a dashed `Polyline`.
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

export type MapMode = "kepadatan" | "rencana";

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

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
  mode,
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
  mode: MapMode;
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

    const layer = L.tileLayer(theme === "dark" ? TILES.dark : TILES.light, {
      attribution: ATTRIBUTION,
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
    const layers = L.layerGroup().addTo(map);

    if (mode === "kepadatan") {
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
          fillOpacity: isSelected ? 0.9 : inRegion ? 0.65 : 0.12,
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
    } else {
      const stopById = new Map(stops.map((stop) => [stop.id, stop]));
      const route = trip
        .map((id) => stopById.get(id))
        .filter((stop): stop is CityStop => Boolean(stop));

      // Legs go in first so a line arriving at a stop never covers its pin.
      if (route.length > 1) {
        L.polyline(
          route.map((stop) => [stop.lat, stop.lng] as L.LatLngTuple),
          {
            color: dark ? "#5eead4" : "#134e4a",
            weight: 3,
            opacity: 0.9,
            dashArray: "8 8",
          },
        ).addTo(layers);
      }

      for (const stop of stops) {
        // A chosen stop is drawn as a numbered pin instead.
        if (trip.includes(stop.id)) continue;

        const inRegion = region === "semua" || stop.region === region;
        const lit = stop.id === highlighted;

        L.circleMarker([stop.lat, stop.lng], {
          radius: lit ? 12 : 9,
          color: lit ? selectedStroke : dark ? "#042f2e" : "#ffffff",
          weight: lit ? 3 : 1.5,
          opacity: inRegion || lit ? 1 : 0.3,
          fillColor: "#0d9488",
          fillOpacity: inRegion || lit ? 0.9 : 0.2,
        })
          .bindTooltip(
            tooltipHtml(stop.name, `${stop.total} destinasi · klik untuk tambah`),
            { ...TOOLTIP_OPTIONS, offset: [0, -6] },
          )
          .on("click", () => handlers.current.onToggleStop(stop.id))
          .addTo(layers);
      }

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
            tooltipHtml(
              `${index + 1}. ${stop.name}`,
              "Klik untuk hapus dari rute",
            ),
            { ...TOOLTIP_OPTIONS, offset: [0, -16] },
          )
          .on("click", () => handlers.current.onToggleStop(stop.id))
          .addTo(layers);
      });
    }

    return () => {
      layers.remove();
    };
  }, [
    generation,
    mode,
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

  return <div ref={containerRef} className="crowd-map h-full w-full bg-muted" />;
}
