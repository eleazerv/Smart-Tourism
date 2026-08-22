import Image from "next/image";
import Link from "next/link";
import { Award } from "lucide-react";
import type { Destination } from "@/lib/api";
import { coverImage } from "@/lib/home-data";
import { FavoriteButton } from "@/components/home/favorite-button";
import { Rating } from "@/components/home/rating";

/** Rating at which a destination earns the badge on its cover. */
const TOP_RATED = 4.5;

export function DestinationCard({
  destination,
  note,
}: {
  destination: Destination;
  /** Extra line under the card — e.g. why it was recommended. */
  note?: string;
}) {
  const place = [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="w-[calc(75%-0.5rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-700">
        <FavoriteButton label={destination.name} />
        <Link href={`/destinations/${destination.id}`}>
          <Image
            src={coverImage(destination, 600, 450)}
            alt={destination.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 75vw"
            className="object-cover transition duration-500 hover:scale-105"
          />
        </Link>
        {(destination.avg_rating ?? 0) >= TOP_RATED && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-900">
            <Award className="h-3 w-3" />
            Rating tertinggi
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1">
        <h3 className="truncate text-sm font-bold">
          <Link
            href={`/destinations/${destination.id}`}
            className="underline-offset-2 hover:underline"
          >
            {destination.name}
          </Link>
        </h3>
        {destination.avg_rating !== null && (
          <Rating value={destination.avg_rating} />
        )}
        <p className="text-xs text-muted-foreground">
          {destination.category}
          {destination.view_count !== null && (
            <>
              {" "}
              &middot; {destination.view_count.toLocaleString("id-ID")} kali
              dilihat
            </>
          )}
        </p>
        {place && <p className="text-xs text-muted-foreground">{place}</p>}
        {note && (
          <p className="truncate text-xs font-medium text-brand-700 dark:text-brand-100">
            {note}
          </p>
        )}
      </div>
    </article>
  );
}
