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
 */
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { divIcon, type ControlPosition } from "leaflet";
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
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-16, 90],
  [11, 145],
];

/** Breathing room around a fitted region, in pixels. */
const FIT_PADDING: [number, number] = [28, 28];

/** A one-stop route has no extent; without this the fit slams to max zoom. */
const FIT_MAX_ZOOM = 8;

const TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  },
};

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Leaflet puts the zoom buttons top left, which is where the floating toolbar
 * now sits.
 *
 * This repositions Leaflet's *own* control rather than mounting react-leaflet's
 * `<ZoomControl>`. That component adds itself from an effect, and on a dev
 * remount the effect can run against a map that has already been torn down —
 * `Map.remove()` deletes `_controlCorners`, so `Control.addTo` then throws
 * "can't access property, map._controlCorners is undefined". The built-in
 * control is created by the map's own init hook and cannot outlive it.
 */
function ZoomPosition({ position }: { position: ControlPosition }) {
  const map = useMap();

  useEffect(() => {
    const control = map.zoomControl;
    if (control) control.setPosition(position);
  }, [map, position]);

  return null;
}

/** Moves the map to `camera` — but only when its token changes, so a marker
 *  click can highlight a province without yanking the view. */
function CameraController({ camera }: { camera: Camera }) {
  const map = useMap();

  useEffect(() => {
    if (camera.kind === "bounds") {
      map.flyToBounds(camera.bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
        duration: 0.9,
      });
    } else {
      map.flyTo([camera.lat, camera.lng], camera.zoom, { duration: 0.9 });
    }
    // Only the token decides when to move; the target rides along with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, camera.token]);

  return null;
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
  const dark = theme === "dark";
  const tiles = dark ? TILES.dark : TILES.light;
  // The selection ring has to read against the basemap, not against the fill.
  const selectedStroke = dark ? "#ffffff" : "#0f172a";
  const routeColor = dark ? "#5eead4" : "#134e4a";

  const stopById = new Map(stops.map((stop) => [stop.id, stop]));
  const route = trip
    .map((id) => stopById.get(id))
    .filter((stop): stop is CityStop => Boolean(stop));

  return (
    <MapContainer
      // First paint fits the whole archipelago; `CameraController` takes over
      // from there. Bounds, not a zoom level, so nothing is cropped on a phone.
      bounds={NATIONAL_BOUNDS}
      boundsOptions={{ padding: FIT_PADDING }}
      minZoom={3}
      maxZoom={9}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={0.7}
      // The map owns the whole screen now, so the wheel belongs to it.
      scrollWheelZoom
      className="crowd-map h-full w-full bg-muted"
    >
      <ZoomPosition position="topright" />
      <TileLayer key={theme} url={tiles.url} attribution={ATTRIBUTION} />
      <CameraController camera={camera} />

      {mode === "kepadatan" &&
        points.map((point) => {
          if (!point.place) return null;

          const inRegion = region === "semua" || point.region === region;
          const isSelected = point.code === selectedCode;
          const level = DENSITY_LEVELS[point.level];

          return (
            <CircleMarker
              key={point.code}
              center={[point.place.lat, point.place.lng]}
              radius={markerRadius(point.intensity)}
              pathOptions={{
                color: isSelected ? selectedStroke : level.color,
                weight: isSelected ? 3 : 1,
                opacity: inRegion ? 1 : 0.25,
                fillColor: level.color,
                fillOpacity: isSelected ? 0.9 : inRegion ? 0.65 : 0.12,
              }}
              eventHandlers={{ click: () => onSelect(point.code) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <span className="font-semibold">{point.name}</span>
                <br />
                {formatVisitorsShort(point.visitorCount)} pengunjung ·{" "}
                {level.label}
              </Tooltip>
            </CircleMarker>
          );
        })}

      {mode === "rencana" && (
        <>
          {/* Legs are drawn first so a line arriving at a stop never covers
              the pin that marks it. */}
          {route.length > 1 && (
            <Polyline
              positions={route.map((stop) => [stop.lat, stop.lng])}
              pathOptions={{
                color: routeColor,
                weight: 3,
                opacity: 0.9,
                dashArray: "8 8",
              }}
            />
          )}

          {stops.map((stop) => {
            // A chosen stop is drawn as a numbered pin instead.
            if (trip.includes(stop.id)) return null;
            const inRegion = region === "semua" || stop.region === region;
            const lit = stop.id === highlighted;

            return (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={lit ? 12 : 9}
                pathOptions={{
                  color: lit ? selectedStroke : dark ? "#042f2e" : "#ffffff",
                  weight: lit ? 3 : 1.5,
                  opacity: inRegion || lit ? 1 : 0.3,
                  fillColor: "#0d9488",
                  fillOpacity: inRegion || lit ? 0.9 : 0.2,
                }}
                eventHandlers={{ click: () => onToggleStop(stop.id) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                  <span className="font-semibold">{stop.name}</span>
                  <br />
                  {stop.total} destinasi · klik untuk tambah
                </Tooltip>
              </CircleMarker>
            );
          })}

          {route.map((stop, index) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={divIcon({
                className: "crowd-map-pin-icon",
                html: `<span class="crowd-map-pin${
                  stop.id === highlighted ? " crowd-map-pin--lit" : ""
                }">${index + 1}</span>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              })}
              eventHandlers={{ click: () => onToggleStop(stop.id) }}
            >
              <Tooltip direction="top" offset={[0, -16]} opacity={1}>
                <span className="font-semibold">
                  {index + 1}. {stop.name}
                </span>
                <br />
                Klik untuk hapus dari rute
              </Tooltip>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
