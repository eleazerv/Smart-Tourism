/**
 * Basemap tiles for every Leaflet map in the app, in one place so the provider
 * can be swapped without hunting through map components.
 *
 * Esri's gray canvas, which needs no API key and ships a light and a dark
 * variant — the app's theme switch reaches the map, so a provider with only
 * one of the two is not usable here.
 *
 * This replaced CARTO's `basemaps.cartocdn.com`, which now stamps
 * "API KEY REQUIRED" across the tile artwork while still answering `200
 * image/png`. Worth remembering when checking a tile server: the status code
 * says nothing, the picture does.
 *
 * Note the axis order. Esri serves `/{z}/{y}/{x}`, the reverse of the
 * `/{z}/{x}/{y}` almost every other provider uses; getting it backwards yields
 * tiles that load without error and show the wrong part of the world.
 */

const CANVAS = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas";

export const MAP_TILES = {
  light: `${CANVAS}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  dark: `${CANVAS}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
};

/** Required by Esri's terms; rendered in the map's attribution control. */
export const MAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function tileUrl(theme: "light" | "dark"): string {
  return theme === "dark" ? MAP_TILES.dark : MAP_TILES.light;
}
