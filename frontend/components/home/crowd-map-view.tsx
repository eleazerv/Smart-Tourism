"use client";

/**
 * The Leaflet half of the crowd map. Loaded through `next/dynamic` with
 * `ssr: false` by `crowd-map-panel.tsx` — Leaflet touches `window` at import
 * time, so it can never run in the server render.
 *
 * Markers are `CircleMarker`s rather than a tile-baked heat layer: the API
 * gives one number per province, so a sized-and-graded dot per province says
 * exactly what the data knows and nothing more.
 */
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
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

/**
 * Camera target. `token` changes whenever the map should actually move, so a
 * re-render for any other reason leaves the view where the reader put it.
 *
 * A region is a box to fit; a single province is a point to fly to.
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
const FIT_PADDING: [number, number] = [24, 24];

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

/** Moves the map to `camera` — but only when its token changes, so a marker
 *  click can highlight a province without yanking the view. */
function CameraController({ camera }: { camera: Camera }) {
  const map = useMap();

  useEffect(() => {
    if (camera.kind === "bounds") {
      map.flyToBounds(camera.bounds, { padding: FIT_PADDING, duration: 0.9 });
    } else {
      map.flyTo([camera.lat, camera.lng], camera.zoom, { duration: 0.9 });
    }
    // Only the token decides when to move; the target rides along with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, camera.token]);

  return null;
}

export default function CrowdMapView({
  points,
  region,
  selectedCode,
  camera,
  theme,
  onSelect,
}: {
  points: DensityPoint[];
  /** Provinces outside this region stay on the map, dimmed for context. */
  region: RegionKey | "semua";
  selectedCode: string | null;
  camera: Camera;
  theme: "light" | "dark";
  onSelect: (code: string) => void;
}) {
  const tiles = theme === "dark" ? TILES.dark : TILES.light;
  // The selection ring has to read against the basemap, not against the fill.
  const selectedStroke = theme === "dark" ? "#ffffff" : "#0f172a";

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
      // A landing page scrolls; the wheel belongs to the page, not the map.
      scrollWheelZoom={false}
      className="crowd-map h-full w-full bg-muted"
    >
      <TileLayer key={theme} url={tiles.url} attribution={ATTRIBUTION} />
      <CameraController camera={camera} />

      {points.map((point) => {
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
              {formatVisitorsShort(point.visitorCount)} pengunjung · {level.label}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
