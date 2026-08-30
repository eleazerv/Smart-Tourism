"use client";

/**
 * Province outlines for the crowd map, loaded once per browser session.
 *
 * Fetched from `/public` rather than imported: 144 KB of JSON inside the map's
 * JS chunk would be parsed as an object literal on every load, where a fetched
 * file is cached by the browser and parsed once.
 *
 * See `public/geo/README.md` for the source, the ODbL terms, and why four
 * provinces share their parent's polygon.
 */

import type { DensityPoint } from "@/lib/heatmap-data";

/** A feature carries every BPS code its polygon covers — usually just one. */
export type ProvinceShape = {
  type: "Feature";
  properties: { codes: string[] };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

export type ProvinceShapes = {
  type: "FeatureCollection";
  features: ProvinceShape[];
};

const URL = "/geo/provinces-idn.geojson";

let cache: Promise<ProvinceShapes | null> | null = null;

/**
 * Resolves to `null` when the file cannot be loaded, which the map treats as
 * "draw nothing" rather than as an error — the cities, the route, and the
 * ranked list beside the map all still work without the outlines.
 */
export function loadProvinceShapes(): Promise<ProvinceShapes | null> {
  cache ??= fetch(URL)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  return cache;
}

/**
 * What one polygon should say and how it should be shaded.
 *
 * A polygon covering several provinces takes the **highest** level among them,
 * never the sum: the four provinces Papua was split into are all quiet, and
 * adding them together would paint the region busier than any part of it
 * actually is. The numbers stay per province in the tooltip.
 */
export type ShapeDatum = {
  members: DensityPoint[];
  level: DensityPoint["level"];
  /** True when the polygon stands for more than one province. */
  merged: boolean;
  /** Highest-traffic member, which names the area. */
  lead: DensityPoint;
};

export function shapeDatum(
  shape: ProvinceShape,
  byCode: Map<string, DensityPoint>,
): ShapeDatum | null {
  const members = shape.properties.codes
    .map((code) => byCode.get(code))
    .filter((point): point is DensityPoint => point !== undefined);

  if (members.length === 0) return null;

  const ordered = [...members].sort((a, b) => b.visitorCount - a.visitorCount);
  const level = ordered.reduce<DensityPoint["level"]>(
    (highest, point) => (point.level > highest ? point.level : highest),
    0,
  );

  return {
    members: ordered,
    level,
    merged: ordered.length > 1,
    lead: ordered[0],
  };
}
