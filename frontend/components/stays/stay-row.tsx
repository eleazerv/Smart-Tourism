import Image from "next/image";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import type { Accommodation } from "@/lib/api";
import { coverImage } from "@/lib/home-data";
import { formatIDR } from "@/lib/seeded-random";
import { tierLabel } from "@/lib/stays-search";
import { Rating } from "@/components/home/rating";

/**
 * One property. Cover on the left, the description in the middle, and the
 * booking column — rate and total — pinned right, which is the layout every
 * accommodation search settled on.
 */
export function StayRow({
  stay,
  nights,
  rooms,
  /** Where the reader lands to keep planning; there is no checkout to send them to. */
  destinationsHref,
  priority,
}: {
  stay: Accommodation;
  nights: number;
  rooms: number;
  destinationsHref: string;
  priority?: boolean;
}) {
  const total = stay.price_per_night * nights * rooms;
  const place = [stay.cities?.name, stay.cities?.provinces?.name]
    .filter(Boolean)
    .join(", ");
  // Seeded rows report an unreviewed property as 0 rather than null, and
  // "0,0" reads as a bad score instead of a missing one.
  const rating =
    stay.avg_rating !== null && stay.avg_rating > 0 ? stay.avg_rating : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 dark:hover:border-brand-100/30 sm:flex">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-brand-700 sm:aspect-auto sm:w-56 lg:w-64">
        <Image
          src={coverImage(stay, 640, 480)}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 100vw"
          className="object-cover"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur dark:text-brand-50">
          {tierLabel(stay.tier)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
            {stay.name}
          </h3>

          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{place}</span>
            </p>
          )}

          {stay.max_guests !== null && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0" />
              Maks. {stay.max_guests} tamu per kamar
            </p>
          )}

          <div className="mt-2.5">
            {rating === null ? (
              <p className="text-xs text-muted-foreground">Belum ada ulasan</p>
            ) : (
              <Rating value={rating} reviews={stay.review_count} />
            )}
          </div>

          {stay.partner_name && (
            <p className="mt-2 text-xs text-muted-foreground">
              Terdaftar lewat mitra {stay.partner_name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col justify-end gap-3 sm:w-48 sm:border-l sm:border-border sm:pl-4">
          <div className="text-right sm:text-left">
            <p className="text-lg font-bold tabular-nums">
              {formatIDR(stay.price_per_night)}
              <span className="text-xs font-medium text-muted-foreground">
                {" "}
                /malam
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatIDR(total)} untuk {nights} malam
              {rooms > 1 && `, ${rooms} kamar`}
            </p>
            <Link
              href={destinationsHref}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:text-brand-100 dark:hover:border-brand-100 dark:hover:bg-brand-700/30"
            >
              Lihat sekitar
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
