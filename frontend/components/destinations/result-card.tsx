import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, MapPin } from "lucide-react";
import type { RecommendedDestination } from "@/lib/api";
import { coverImage } from "@/lib/home-data";
import { formatCount } from "@/lib/destination-data";
import { FavoriteButton } from "@/components/home/favorite-button";
import { Rating } from "@/components/home/rating";

export type ResultProps = {
  destination: RecommendedDestination;
  /** Reviews behind the score; omitted when the count could not be loaded. */
  reviews?: number;
  /** Whether the signed-in reader has already saved this destination. */
  saved?: boolean;
  /** Skips lazy-loading for the covers above the fold. */
  priority?: boolean;
};

function placeOf(destination: RecommendedDestination) {
  return [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");
}

/*
 * Both variants use the stretched-link pattern: the title stays a real anchor,
 * and its `::after` is blown up to cover the whole card, so clicking anywhere
 * on the card follows it. That keeps one link per card in the accessibility
 * tree — wrapping the card in an anchor instead would nest the bookmark button
 * inside a link, which is invalid and unusable by keyboard.
 *
 * Anything else that must stay clickable has to sit above that overlay, hence
 * the `relative z-10` on the bookmark.
 */

/**
 * Booking-style row: cover on the left, editorial detail in the middle, and
 * the reach column pinned right.
 */
export function ResultRow({
  destination,
  reviews,
  saved,
  priority,
}: ResultProps) {
  const place = placeOf(destination);
  const href = `/destinations/${destination.id}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 sm:flex">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-brand-700 sm:aspect-auto sm:w-56 lg:w-64">
        <FavoriteButton
          destinationId={destination.id}
          label={destination.name}
          initialSaved={saved}
          className="z-10"
        />
        <Image
          src={coverImage(destination, 640, 480)}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 100vw"
          className="object-cover"
        />
        {destination.category && (
          <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur">
            {destination.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
            <Link
              href={href}
              className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-700"
            >
              {destination.name}
            </Link>
          </h3>

          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{place}</span>
            </p>
          )}

          {destination.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/80">
              {destination.description}
            </p>
          )}

          <div className="mt-3">
            <RatingLine destination={destination} reviews={reviews} />
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:w-40 sm:flex-col sm:items-start sm:justify-center sm:border-l sm:border-border sm:pl-4">
          <ViewCount destination={destination} />
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
          >
            Lihat detail
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Compact variant for the grid view — same data, one column wide. */
export function ResultTile({
  destination,
  reviews,
  saved,
  priority,
}: ResultProps) {
  const place = placeOf(destination);
  const href = `/destinations/${destination.id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
        <FavoriteButton
          destinationId={destination.id}
          label={destination.name}
          initialSaved={saved}
          className="z-10"
        />
        <Image
          src={coverImage(destination, 600, 450)}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
          className="object-cover"
        />
        {destination.category && (
          <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur">
            {destination.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-snug tracking-tight">
            <Link
              href={href}
              className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-700"
            >
              {destination.name}
            </Link>
          </h3>
          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>

        <RatingLine destination={destination} reviews={reviews} />

        <div className="border-t border-border pt-3">
          <ViewCount destination={destination} />
        </div>
      </div>
    </article>
  );
}

/** Stars, score, and the word for it — the one signal a browser scans for. */
function RatingLine({
  destination,
  reviews,
}: {
  destination: RecommendedDestination;
  reviews?: number;
}) {
  // The API reports an unreviewed destination as 0 rather than null, and a
  // "0,0 — Biasa" line reads as a bad score instead of a missing one.
  const rating =
    destination.avg_rating !== null && destination.avg_rating > 0
      ? destination.avg_rating
      : null;

  if (rating === null) {
    return (
      <p className="text-xs text-muted-foreground">Belum ada ulasan</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Rating value={rating} reviews={reviews} />
      {/* <span className="text-xs font-semibold">{ratingLabel(rating)}</span> */}
    </div>
  );
}

function ViewCount({ destination }: { destination: RecommendedDestination }) {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Eye className="h-3 w-3 shrink-0" />
      {formatCount(destination.view_count)} kali dilihat
    </p>
  );
}
