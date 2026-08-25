import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, MapPin, Users } from "lucide-react";
import type { RecommendedDestination } from "@/lib/api";
import { coverImage } from "@/lib/home-data";
import {
  formatCount,
  ratingLabel,
  type CrowdLevel,
} from "@/lib/destination-data";
import { formatRating } from "@/lib/destinations-search";
import { FavoriteButton } from "@/components/home/favorite-button";
import { cn } from "@/lib/utils";

export type ResultProps = {
  destination: RecommendedDestination;
  /** Province-level crowding for this row; null when the province is unranked. */
  crowd: CrowdLevel | null;
  /** Skips lazy-loading for the covers above the fold. */
  priority?: boolean;
};

function placeOf(destination: RecommendedDestination) {
  return [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");
}

/**
 * Booking-style row: cover on the left, editorial detail in the middle, and
 * the decision column — score, crowding, call to action — pinned right.
 */
export function ResultRow({ destination, crowd, priority }: ResultProps) {
  const place = placeOf(destination);
  const href = `/destinations/${destination.id}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 dark:hover:border-brand-100/30 sm:flex">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-brand-700 sm:aspect-auto sm:w-56 lg:w-64">
        <FavoriteButton label={destination.name} />
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <Image
            src={coverImage(destination, 640, 480)}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 100vw"
            className="object-cover"
          />
        </Link>
        {destination.category && (
          <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur dark:text-brand-50">
            {destination.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight">
            <Link href={href} className="underline-offset-4 hover:underline">
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
            <CrowdMeter crowd={crowd} />
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-end justify-between gap-3 sm:w-44 sm:flex-col sm:items-stretch sm:border-l sm:border-border sm:pl-4">
          <ScoreBlock destination={destination} />
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            Lihat panduan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Compact variant for the grid view — same data, one column wide. */
export function ResultTile({ destination, crowd, priority }: ResultProps) {
  const place = placeOf(destination);
  const href = `/destinations/${destination.id}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 dark:hover:border-brand-100/30">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
        <FavoriteButton label={destination.name} />
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <Image
            src={coverImage(destination, 600, 450)}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        </Link>
        {destination.category && (
          <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-900 backdrop-blur dark:text-brand-50">
            {destination.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-snug tracking-tight">
            <Link href={href} className="underline-offset-4 hover:underline">
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

        <CrowdMeter crowd={crowd} />

        <div className="border-t border-border pt-3">
          <ScoreBlock destination={destination} />
        </div>
      </div>
    </article>
  );
}

/** Score chip in the register booking sites use: label, evidence, then number. */
function ScoreBlock({ destination }: { destination: RecommendedDestination }) {
  // The API reports an unreviewed destination as 0 rather than null, and a
  // "0,0 — Biasa" badge reads as a bad score instead of a missing one.
  const rating =
    destination.avg_rating !== null && destination.avg_rating > 0
      ? destination.avg_rating
      : null;

  return (
    <div className="flex items-center justify-between gap-2 sm:justify-start">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {rating === null ? (
            <span className="text-muted-foreground">Belum ada ulasan</span>
          ) : (
            ratingLabel(rating)
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3 shrink-0" />
          {formatCount(destination.view_count)} kali dilihat
        </p>
      </div>
      {rating !== null && (
        <span
          aria-label={`Rating ${formatRating(rating)} dari 5`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg rounded-bl-sm bg-brand-700 text-sm font-bold tabular-nums text-white dark:bg-brand-100 dark:text-brand-900"
        >
          {formatRating(rating)}
        </span>
      )}
    </div>
  );
}

/**
 * Province-level crowding. Uses the conventional traffic-light colours rather
 * than the brand teal — "sepi" and "ramai" only read at a glance in green and
 * red, the same exception the star rating makes for amber.
 */
const TONES = {
  quiet: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  moderate: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  busy: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
  },
} as const;

function CrowdMeter({ crowd }: { crowd: CrowdLevel | null }) {
  if (!crowd) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0" />
        Data kepadatan belum tersedia
      </p>
    );
  }

  const tone = TONES[crowd.tone];
  // The quietest provinces round down to a flat 0, which reads as missing
  // data rather than as "barely visited" — and leaves an empty bar behind.
  const share = crowd.share > 0 ? `${crowd.share}%` : "<1%";

  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold">
        <span
          aria-hidden="true"
          className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)}
        />
        <span className={tone.text}>{crowd.label}</span>
        <span className="font-normal text-muted-foreground">
          &middot; {share} dari provinsi terpadat
        </span>
      </p>
      <div
        role="img"
        aria-label={crowd.description}
        className="mt-1.5 h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={cn("block h-full rounded-full", tone.dot)}
          style={{ width: `${Math.max(crowd.share, 2)}%` }}
        />
      </div>
    </div>
  );
}
