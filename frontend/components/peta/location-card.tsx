import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PlaceMapEmbed } from "@/components/peta/place-map-embed";
import { formatCoordinates, mapsUrl } from "@/lib/destination-data";

/**
 * The "Lokasi" block shared by the destination and accommodation detail pages.
 *
 * Renders a real map when the row carries coordinates, and falls back to the
 * calm grid placeholder when it does not — plenty of seeded rows still have
 * null latitude, and an empty map reading as "somewhere off West Africa" is
 * worse than admitting the coordinates are missing.
 *
 * The Maps link stays either way: the embedded map is for orientation, and
 * handing off to Maps is what actually gets someone there.
 */

export type MappablePlace = {
  name: string;
  latitude: number | null;
  longitude: number | null;
};

export function LocationCard({
  place,
  /** "Kota, Provinsi" — the human-readable line under the map. */
  placeLabel,
}: {
  place: MappablePlace;
  placeLabel: string;
}) {
  const t = useTranslations("map");
  const locale = useLocale();

  const mapped = place.latitude !== null && place.longitude !== null;
  const coordinates = mapped
    ? formatCoordinates(place.latitude!, place.longitude!, locale)
    : null;

  return (
    <section id="lokasi" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <MapPin className="h-5 w-5 text-brand-700" />
        {t("locationHeading")}
      </h2>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-56 bg-brand-tint/10">
          {mapped ? (
            <PlaceMapEmbed
              lat={place.latitude!}
              lng={place.longitude!}
              label={place.name}
            />
          ) : (
            <>
              {/* Stand-in for the map: a calm grid that reads as "map area"
                  without pretending to show real geography. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-50 [background-image:linear-gradient(hsl(var(--brand-700)/0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--brand-700)/0.12)_1px,transparent_1px)] [background-size:28px_28px]"
              />
              <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-700 text-white shadow-pop">
                <Navigation className="h-4 w-4" />
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {placeLabel || place.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {coordinates ?? t("coordinatesMissing")}
            </p>
          </div>
          <a
            href={mapsUrl(place)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-brand-tint/10"
          >
            {t("openInMaps")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
