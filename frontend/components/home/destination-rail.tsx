import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getAllDestinations, type Destination } from "@/lib/api";
import { DestinationCard } from "@/components/home/destination-card";
import { LoadError } from "@/components/home/load-error";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";
import { loadSavedIds } from "@/lib/saved-destinations";

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
  const t = await getTranslations("home.popular");
  const common = await getTranslations("common");

  let destinations: Destination[];
  try {
    destinations = await loadPopular();
  } catch {
    return (
      <Section title={t("title")}>
        <LoadError what={t("loadErrorWhat")} />
      </Section>
    );
  }

  if (destinations.length === 0) return null;

  // Read after the cached loader above, never inside it — see loadSavedIds.
  const savedIds = await loadSavedIds();

  return (
    <Section
      title={t("title")}
      action={{ label: common("exploreAll"), href: "/destinations" }}
    >
      <Rail label={t("railLabel")}>
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            saved={savedIds.has(destination.id)}
          />
        ))}
      </Rail>
    </Section>
  );
}
