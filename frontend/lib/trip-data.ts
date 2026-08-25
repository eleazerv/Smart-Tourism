/**
 * City stops for the trip planner on the landing-page map.
 *
 * There is no `/api/cities` route, and no city carries coordinates of its own.
 * Both are derived from `/api/destinations` instead: a city is wherever the
 * catalogue has destinations, and its position is the mean of theirs. That
 * keeps the planner honest — every stop it offers is a place the app can
 * actually recommend something in.
 */
import type { Destination } from "@/lib/api";
import { regionOfProvince, type RegionKey } from "@/lib/heatmap-data";

/** Suggested destinations shown per stop. */
const HIGHLIGHTS = 3;

export type StopHighlight = {
  id: string;
  name: string;
  category: string | null;
  /** 0 when nobody has reviewed the destination yet. */
  rating: number;
};

export type CityStop = {
  id: number;
  name: string;
  provinceName: string;
  region: RegionKey;
  /** Mean position of the city's destinations. */
  lat: number;
  lng: number;
  /** How many destinations the catalogue has here. */
  total: number;
  /** Best-rated first, then most-viewed. */
  highlights: StopHighlight[];
};

/** Best first: rating, then views for the many rows with no reviews yet. */
function byAppeal(a: Destination, b: Destination) {
  return (
    (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
    (b.view_count ?? 0) - (a.view_count ?? 0)
  );
}

export function buildCityStops(destinations: Destination[]): CityStop[] {
  const groups = new Map<number, Destination[]>();
  for (const destination of destinations) {
    if (!destination.cities) continue;
    const rows = groups.get(destination.cities.id);
    if (rows) rows.push(destination);
    else groups.set(destination.cities.id, [destination]);
  }

  const stops: CityStop[] = [];

  for (const rows of groups.values()) {
    const located = rows.filter(
      (row) => row.latitude !== null && row.longitude !== null,
    );
    // A stop with no coordinates cannot be drawn or routed through.
    if (located.length === 0) continue;

    const city = rows[0].cities!;
    const province = rows[0].provinces;
    const ranked = [...rows].sort(byAppeal);

    stops.push({
      id: city.id,
      name: city.name,
      provinceName: province?.name ?? "",
      region: regionOfProvince(province?.code ?? ""),
      lat: located.reduce((sum, row) => sum + row.latitude!, 0) / located.length,
      lng: located.reduce((sum, row) => sum + row.longitude!, 0) / located.length,
      total: rows.length,
      highlights: ranked.slice(0, HIGHLIGHTS).map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        rating: row.avg_rating ?? 0,
      })),
    });
  }

  return stops.sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/* ------------------------------------------------------------- distance --- */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance. Straight-line, not driving distance — the route the
 *  map draws is a plan sketch, not a navigation instruction. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Total length of the legs between consecutive stops, in kilometres. */
export function routeDistanceKm(stops: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i += 1) {
    total += haversineKm(stops[i - 1], stops[i]);
  }
  return total;
}

export function formatKm(km: number): string {
  const rounded = Math.round(km);
  return `${new Intl.NumberFormat("id-ID").format(rounded)} km`;
}
