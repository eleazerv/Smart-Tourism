import { cacheLife } from "next/cache";
import { getAllDestinations, type Destination } from "@/lib/api";
import { DestinationCard } from "@/components/home/destination-card";
import { LoadError } from "@/components/home/load-error";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

const SHOWN = 8;

async function loadPopular() {
  "use cache";
  cacheLife("hours");

  // `/api/destinations` orders by region, so popularity has to be applied
  // across the whole catalogue rather than within the first page.
  const all = await getAllDestinations();
  return [...all]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, SHOWN);
}

export async function DestinationRail() {
  let destinations: Destination[];
  try {
    destinations = await loadPopular();
  } catch {
    return (
      <Section title="Destinasi populer di Indonesia">
        <LoadError what="Destinasi populer" />
      </Section>
    );
  }

  if (destinations.length === 0) return null;

  return (
    <Section
      title="Destinasi populer di Indonesia"
      action={{ label: "Jelajahi semua", href: "/destinations" }}
    >
      <Rail label="Destinasi populer">
        {destinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </Rail>
    </Section>
  );
}
