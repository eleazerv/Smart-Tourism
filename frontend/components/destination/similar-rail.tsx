import { cacheLife } from "next/cache";
import { searchDestinations, type Destination } from "@/lib/api";
import { DestinationCard } from "@/components/home/destination-card";
import { loadSavedIds } from "@/lib/saved-destinations";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

const SHOWN = 8;

async function loadSimilar(
  destinationId: string,
  tagSlugs: string[],
  provinceId: number | null,
) {
  "use cache";
  cacheLife("hours");

  // Shared tags are the closest thing the API has to "similar"; the province
  // is the fallback for destinations that carry no tags yet.
  const byTags =
    tagSlugs.length > 0
      ? (await searchDestinations({ tags: tagSlugs.join(",") })).data
      : [];

  const byProvince =
    byTags.length < SHOWN && provinceId !== null
      ? (await searchDestinations({ province_id: provinceId })).data
      : [];

  const seen = new Set([destinationId]);
  const merged: Destination[] = [];
  for (const item of [...byTags, ...byProvince]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, SHOWN);
}

/** "You might also like" rail, reusing the home page's card and rail. */
export async function SimilarRail({
  destinationId,
  tagSlugs,
  provinceId,
  provinceName,
}: {
  destinationId: string;
  tagSlugs: string[];
  provinceId: number | null;
  provinceName: string | null;
}) {
  let destinations: Destination[];
  try {
    destinations = await loadSimilar(destinationId, tagSlugs, provinceId);
  } catch {
    return null;
  }

  if (destinations.length === 0) return null;

  // Read after the cached loader above, never inside it — see loadSavedIds.
  const savedIds = await loadSavedIds();

  return (
    <Section
      title="Destinasi serupa"
      subtitle={
        provinceName
          ? `Pilihan lain dengan suasana sejenis, sebagian di ${provinceName}.`
          : "Pilihan lain dengan suasana sejenis."
      }
      action={{ label: "Jelajahi semua", href: "/destinations" }}
    >
      <Rail label="Destinasi serupa">
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
