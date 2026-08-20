import Image from "next/image";
import Link from "next/link";
import { Award } from "lucide-react";
import { nearbyDestinations, photo, type Destination } from "@/lib/home-data";
import { FavoriteButton } from "@/components/home/favorite-button";
import { Rail } from "@/components/home/rail";
import { Rating } from "@/components/home/rating";
import { Section } from "@/components/home/section";

export function DestinationRail() {
  return (
    <Section
      title="Destinasi populer di Indonesia"
      action={{ label: "Jelajahi semua", href: "/destinations" }}
    >
      <Rail label="Destinasi populer">
        {nearbyDestinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </Rail>
    </Section>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="w-[calc(75%-0.5rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-700">
        <FavoriteButton label={destination.name} />
        <Link href={`/destinations/${destination.id}`}>
          <Image
            src={photo(destination.seed, 600, 450)}
            alt={destination.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 75vw"
            className="object-cover transition duration-500 hover:scale-105"
          />
        </Link>
        {destination.badge && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-900">
            <Award className="h-3 w-3" />
            2026
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
        <Rating value={destination.rating} reviews={destination.reviews} />
        <p className="text-xs text-muted-foreground">
          {destination.priceLevel} &middot; {destination.category}
        </p>
        <p className="text-xs text-muted-foreground">
          {destination.city}, {destination.province}
        </p>
      </div>
    </article>
  );
}
