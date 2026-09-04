"use client";

/**
 * One place, one pin. The small map embedded in the destination and
 * accommodation detail pages.
 *
 * Loaded through `next/dynamic` with `ssr: false` by `LocationCard` — Leaflet
 * touches `window` at import time, so it can never run in the server render.
 *
 * Leaflet is driven directly rather than through `react-leaflet`, for the same
 * reason `crowd-map-view.tsx` gives at length: that library cannot survive
 * React disconnecting and reconnecting effects, which is exactly what the App
 * Router does to a cached route on back/forward. Owning the lifecycle means
 * the create-effect simply runs again and builds a fresh map into the same
 * div, which `Map.remove()` leaves reusable by deleting its `_leaflet_id`.
 */
import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import { MAP_ATTRIBUTION, tileUrl } from "@/lib/map-tiles";

/** Close enough to read the surrounding streets without losing the district. */
const ZOOM = 14;

/**
 * Zoomed out past this the pin sits in an empty grey field: the place is no
 * longer locatable and the map has stopped answering the question it was put
 * on the page to answer.
 */
const MIN_ZOOM = 11;

/** Esri's gray canvas stops serving tiles here; past it Leaflet upscales. */
const MAX_NATIVE_ZOOM = 16;
const MAX_ZOOM = 17;

/**
 * Width of the pannable box around the pin, in metres. Must stay comfortably
 * wider than the viewport at MIN_ZOOM (~53 km across this card) or Leaflet
 * spends every frame shoving the centre back and the map judders.
 */
const PAN_BOX_M = 300_000;

export default function PlaceMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  /** Tooltip on the pin; the place's own name. */
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Bumped when a fresh map exists, so the layer effects below re-run against
  // it rather than against a map that has just been removed.
  const [generation, setGeneration] = useState(0);

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const map = L.map(element, {
      center: [lat, lng],
      zoom: ZOOM,
      zoomControl: false,
      // A map sitting mid-article must not swallow the page scroll. Dragging,
      // double-click, and the zoom buttons all still work.
      scrollWheelZoom: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      // This map shows one place. Without a leash the reader can drag the pin
      // off screen and zoom out to the whole planet, ending up somewhere that
      // tells them nothing and offers no way back.
      maxBounds: L.latLng(lat, lng).toBounds(PAN_BOX_M),
      // Elastic rather than a hard wall: a flick past the edge eases back
      // instead of stopping dead against an invisible barrier.
      maxBoundsViscosity: 0.8,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;
    setGeneration((current) => current + 1);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.tileLayer(tileUrl(theme), {
      attribution: MAP_ATTRIBUTION,
      // Beyond MAX_NATIVE_ZOOM the provider 404s; capping it here makes
      // Leaflet stretch the last real tile instead of showing blank squares.
      maxNativeZoom: MAX_NATIVE_ZOOM,
      maxZoom: MAX_ZOOM,
      noWrap: true,
    }).addTo(map);

    return () => {
      layer.remove();
    };
  }, [generation, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // A `divIcon` rather than Leaflet's default marker: the default pulls PNGs
    // from a relative path the bundler rewrites, which silently 404s.
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "place-map-pin-icon",
        html: '<span class="place-map-pin"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      keyboard: false,
      title: label,
    }).addTo(map);

    marker.bindTooltip(label, { direction: "top", offset: [0, -12] });

    return () => {
      marker.remove();
    };
  }, [generation, lat, lng, label]);

  return (
    <div
      ref={containerRef}
      // Not focusable and hidden from the reading order: the coordinates and
      // the Maps link beneath carry the same information in text.
      aria-hidden="true"
      className="map-surface h-full w-full bg-muted"
    />
  );
}
