import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { photo } from "@/lib/home-data";
import { ratingLabel } from "@/lib/destination-data";
import { formatIDR } from "@/lib/seeded-random";
import { stayTypeLabel, type Stay } from "@/lib/stay-data";
import { formatScore } from "@/lib/stays-search";
import { FavoriteButton } from "@/components/home/favorite-button";

/**
 * One property. Cover on the left, the description in the middle, and the
 * booking column — guest score, nightly rate, total — pinned right, which is
 * the layout every accommodation search settled on.
 */
export function StayRow({
  stay,
  nights,
  rooms,
  /** Where the reader lands to keep planning; there is no checkout to send them to. */
  destinationsHref,
  priority,
}: {
  stay: Stay;
  nights: number;
  rooms: number;
  destinationsHref: string;
  priority?: boolean;
}) {
  const total = stay.pricePerNight * nights * rooms;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 hover:shadow-pop dark:hover:border-brand-100/30 sm:flex">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-brand-700 sm:aspect-auto sm:w-56 lg:w-64">
        <FavoriteButton label={stay.name} />
        <Image
          src={photo(`stay-${stay.id}`, 640, 480)}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur dark:text-brand-50">
          {stayTypeLabel(stay.type)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
              {stay.name}
            </h3>
            <span
              className="flex items-center gap-0.5"
              role="img"
              aria-label={`${stay.stars} bintang`}
            >
              {Array.from({ length: stay.stars }, (_, i) => (
                <Star
                  key={i}
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                />
              ))}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {stay.area} &middot; {stay.cityName}, {stay.provinceName}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stay.distanceKm.toLocaleString("id-ID")} km dari pusat kota
            &middot; maks. {stay.maxGuests} tamu per kamar
          </p>

          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {stay.facilities.slice(0, 5).map((facility) => (
              <li
                key={facility}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {facility}
              </li>
            ))}
            {stay.facilities.length > 5 && (
              <li className="px-1 py-1 text-[11px] font-medium text-muted-foreground">
                +{stay.facilities.length - 5} lainnya
              </li>
            )}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-3 sm:w-48 sm:border-l sm:border-border sm:pl-4">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {ratingLabel(stay.score)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stay.reviews.toLocaleString("id-ID")} ulasan
              </p>
            </div>
            <span
              aria-label={`Rating tamu ${formatScore(stay.score)} dari 5`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg rounded-bl-sm bg-brand-700 text-sm font-bold tabular-nums text-white dark:bg-brand-100 dark:text-brand-900"
            >
              {formatScore(stay.score)}
            </span>
          </div>

          <div className="text-right sm:text-left">
            <p className="text-lg font-bold tabular-nums">
              {formatIDR(stay.pricePerNight)}
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
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
            >
              Lihat sekitar
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
