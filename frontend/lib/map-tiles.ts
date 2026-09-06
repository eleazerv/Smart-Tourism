/**
 * Basemap tiles for every Leaflet map in the app, in one place so the provider
 * can be swapped without hunting through map components.
 *
 * Esri's light gray canvas, which needs no API key.
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

export const MAP_TILE_URL = `${CANVAS}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;

/** Required by Esri's terms; rendered in the map's attribution control. */
export const MAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Added on top of the tile attribution wherever province outlines are drawn.
 * geoBoundaries is ODbL, which requires the credit — see
 * `public/geo/README.md`.
 */
export const BOUNDARY_ATTRIBUTION =
  'Batas wilayah: <a href="https://www.geoboundaries.org/">geoBoundaries.org</a> (ODbL)';
