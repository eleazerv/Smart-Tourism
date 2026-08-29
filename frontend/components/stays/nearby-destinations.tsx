import { cacheLife } from "next/cache";
import { searchDestinations, type Accommodation, type Destination } from "@/lib/api";
import { haversineKm } from "@/lib/trip-data";
import { loadSavedIds } from "@/lib/saved-destinations";
import { DestinationCard } from "@/components/home/destination-card";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

const SHOWN = 8;

/**
 * Candidates to rank, widest net first: the city the property sits in, then
 * the province if that alone is too thin. There is no "destinations near a
 * point" route — the reverse of it exists as `/destinations/:id/accommodations`
 * — so the shortlist is drawn administratively and the ordering is done here.
 */
async function loadCandidates(
  cityId: number | null,
  provinceId: number | null,
): Promise<Destination[]> {
  "use cache";
  cacheLife("hours");

  const byCity =
    cityId !== null ? (await searchDestinations({ city_id: cityId })).data : [];

  const byProvince =
    byCity.length < SHOWN && provinceId !== null
      ? (await searchDestinations({ province_id: provinceId })).data
      : [];

  const seen = new Set<string>();
  const merged: Destination[] = [];
  for (const item of [...byCity, ...byProvince]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

/**
 * Where "Jelajahi semua" lands. The catalogue understands `q` and
 * `province_id` but has no city filter, so the city is passed as a search
 * term and the province is the fallback.
 */
function catalogueHref(stay: Accommodation): string {
  const city = stay.cities?.name;
  if (city) return `/destinations?q=${encodeURIComponent(city)}`;
  const provinceId = stay.cities?.provinces?.id;
  return provinceId ? `/destinations?province_id=${provinceId}` : "/destinations";
}

/** "1,2 km" under 10 km, "23 km" above — a decimal stops mattering by then. */
function formatKm(km: number): string {
  return km < 10
    ? `${km.toFixed(1).replace(".", ",")} km`
    : `${Math.round(km)} km`;
}

/**
 * "What is there to do around here" rail at the foot of a property page.
 *
 * Ordered by straight-line distance from the property when both ends have
 * coordinates — which is a bearing, not a travel time, so the label says the
 * distance rather than implying a journey. Rows missing coordinates keep their
 * catalogue order at the back instead of being dropped.
 */
export async function NearbyDestinations({ stay }: { stay: Accommodation }) {
  const cityId = stay.cities?.id ?? null;
  const provinceId = stay.cities?.provinces?.id ?? null;
  if (cityId === null && provinceId === null) return null;

  let candidates: Destination[];
  try {
    candidates = await loadCandidates(cityId, provinceId);
  } catch {
    return null;
  }
  if (candidates.length === 0) return null;

  const origin =
    stay.latitude !== null && stay.longitude !== null
      ? { lat: stay.latitude, lng: stay.longitude }
      : null;

  const ranked = candidates
    .map((destination) => ({
      destination,
      km:
        origin !== null &&
        destination.latitude !== null &&
        destination.longitude !== null
          ? haversineKm(origin, {
              lat: destination.latitude,
              lng: destination.longitude,
            })
          : null,
    }))
    // Infinity parks the unmeasurable ones at the end without discarding them.
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
    .slice(0, SHOWN);

  const savedIds = await loadSavedIds();
  const place = stay.cities?.name ?? stay.cities?.provinces?.name ?? null;

  return (
    <Section
      title="Destinasi di sekitar penginapan"
      subtitle={
        place
          ? `Yang bisa dikunjungi selama menginap di ${place}, diurutkan dari yang terdekat.`
          : "Yang bisa dikunjungi selama menginap, diurutkan dari yang terdekat."
      }
      action={{ label: "Jelajahi semua", href: catalogueHref(stay) }}
    >
      <Rail label="Destinasi di sekitar penginapan">
        {ranked.map(({ destination, km }) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            saved={savedIds.has(destination.id)}
            note={km === null ? undefined : `${formatKm(km)} dari penginapan`}
          />
        ))}
      </Rail>
    </Section>
  );
}
