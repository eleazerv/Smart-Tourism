import { ExternalLink, MapPin, Navigation } from "lucide-react";
import type { DestinationDetail } from "@/lib/api";
import { formatCoordinates, mapsUrl } from "@/lib/destination-data";

/**
 * Location block. The project has no map tiles of its own, so this states the
 * coordinates plainly and hands off to Maps rather than faking an embed.
 */
export function LocationCard({
  destination,
}: {
  destination: DestinationDetail;
}) {
  const place = [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");
  const coordinates =
    destination.latitude !== null && destination.longitude !== null
      ? formatCoordinates(destination.latitude, destination.longitude)
      : null;

  return (
    <section id="lokasi" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <MapPin className="h-5 w-5 text-brand-700 dark:text-brand-100" />
        Lokasi
      </h2>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {/* Stand-in for the map: a calm grid that reads as "map area" without
            pretending to show real geography. */}
        <div className="relative h-36 bg-brand-50 dark:bg-brand-700/30">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-50 [background-image:linear-gradient(hsl(var(--brand-700)/0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--brand-700)/0.12)_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-700 text-white shadow-pop dark:bg-brand-100 dark:text-brand-900">
            <Navigation className="h-4 w-4" />
          </span>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {place || destination.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {coordinates ?? "Koordinat belum tersedia"}
            </p>
          </div>
          <a
            href={mapsUrl(destination)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
          >
            Buka di Google Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
