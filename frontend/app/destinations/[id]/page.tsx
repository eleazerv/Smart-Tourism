import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Info, Sparkles } from "lucide-react";
import {
  getDestination,
  getHeatmap,
  getSeasonalRecommendations,
  type DestinationDetail,
  type HeatmapEntry,
} from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Rating } from "@/components/home/rating";
import { BestTime } from "@/components/destination/best-time";
import { Breadcrumb } from "@/components/destination/breadcrumb";
import { DetailSkeleton } from "@/components/destination/detail-skeleton";
import { Facts } from "@/components/destination/facts";
import { Gallery } from "@/components/destination/gallery";
import { LocationCard } from "@/components/peta/location-card";
import { MobileBar } from "@/components/destination/mobile-bar";
import { NearbyEvents } from "@/components/destination/nearby-events";
import { PlanCard } from "@/components/destination/plan-card";
import { ReviewsSection } from "@/components/destination/reviews-section";
import { SaveButton } from "@/components/destination/save-button";
import { ShareButton } from "@/components/destination/share-button";
import { SimilarRail } from "@/components/destination/similar-rail";
import { TrackView } from "@/components/destination/track-view";
import { crowdLevel, formatCount, gallery } from "@/lib/destination-data";
import { loadSavedIds } from "@/lib/saved-destinations";

type PageProps = { params: Promise<{ id: string }> };

/**
 * One destination, read once per render and shared by the page body and its
 * metadata. Cached because the row changes far less often than the page is
 * viewed; the view counter runs from the browser, not from this read.
 */
async function loadDestination(id: string) {
  "use cache";
  cacheLife("minutes");
  return getDestination(id);
}

async function loadHeatmap(): Promise<HeatmapEntry[]> {
  "use cache";
  cacheLife("hours");
  try {
    return await getHeatmap();
  } catch {
    return [];
  }
}

/**
 * The months whose seasonal recommendation includes this destination, asked one
 * month at a time because `/api/recommendations` only answers for a single
 * month. Twelve calls is why this sits in its own cached scope.
 */
async function loadBestMonths(destinationId: string, provinceId: number | null) {
  "use cache";
  cacheLife("hours");

  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) =>
      getSeasonalRecommendations({
        month: i + 1,
        province_id: provinceId ?? undefined,
      }),
    ),
  );

  const months: number[] = [];
  const seasons = new Set<string>();

  results.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const { destinations, season_info } = result.value;
    if (!destinations.some((item) => item.id === destinationId)) return;
    months.push(i + 1);
    // The call is scoped to this destination's province, so every entry here
    // describes that province's climate in the matched month.
    for (const entry of season_info) seasons.add(entry.season);
  });

  return { months, seasons: [...seasons] };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  let destination: DestinationDetail | null = null;
  try {
    destination = await loadDestination(id);
  } catch {
    destination = null;
  }
  if (!destination) return { title: "Destinasi tidak ditemukan" };

  const place = [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");
  const description =
    destination.description?.slice(0, 160) ??
    `Panduan kunjungan ${destination.name}${place ? ` di ${place}` : ""}: waktu terbaik, kepadatan, dan ulasan pengunjung.`;

  return {
    title: destination.name,
    description,
    openGraph: {
      title: destination.name,
      description,
      type: "article",
      images: destination.cover_image_url
        ? [{ url: destination.cover_image_url }]
        : undefined,
    },
  };
}

export default function DestinationPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* params is dynamic, so the whole guide streams in behind one
            boundary and the header/footer shell stays static. */}
        <Suspense fallback={<DetailSkeleton />}>
          <Guide params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Guide({ params }: PageProps) {
  const { id } = await params;

  let destination: DestinationDetail | null;
  try {
    destination = await loadDestination(id);
  } catch {
    // An unreachable API is not a missing destination, but there is nothing to
    // render either way, and not-found.tsx covers both.
    destination = null;
  }
  if (!destination) notFound();

  const [heatmap, bestTime, savedIds] = await Promise.all([
    loadHeatmap(),
    loadBestMonths(destination.id, destination.province_id),
    loadSavedIds(),
  ]);

  const crowd = crowdLevel(destination.provinces?.code, heatmap);
  const place = [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <TrackView destinationId={destination.id} />

      <div className="container-page pt-5">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/" },
            { label: "Destinasi", href: "/destinations" },
            ...(destination.provinces
              ? [
                  {
                    label: destination.provinces.name,
                    href: `/destinations?province_id=${destination.provinces.id}`,
                  },
                ]
              : []),
            { label: destination.name },
          ]}
        />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {destination.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {destination.avg_rating !== null && (
                <Rating value={destination.avg_rating} className="text-sm" />
              )}
              {place && <span>{place}</span>}
              {destination.category && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-700/40 dark:text-brand-50">
                  {destination.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ShareButton name={destination.name} />
            <SaveButton
              destinationId={destination.id}
              name={destination.name}
              initialSaved={savedIds.has(destination.id)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Gallery images={gallery(destination)} name={destination.name} />
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-10">
            <Facts destination={destination} />

            <section>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
                <Info className="h-5 w-5 text-brand-700 dark:text-brand-100" />
                Tentang destinasi ini
              </h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/90">
                {destination.description?.trim() ||
                  `Deskripsi ${destination.name} belum tersedia. Kepadatan, waktu terbaik, dan ulasan pengunjung di bawah tetap bisa membantu Anda merencanakan kunjungan.`}
              </p>

              {destination.tags.length > 0 && (
                <>
                  <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-brand-700 dark:text-brand-100" />
                    Cocok untuk
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {destination.tags.map((tag) => (
                      <li key={tag.id}>
                        <a
                          href={`/destinations?tags=${tag.slug}`}
                          className="inline-block rounded-full border border-border px-3.5 py-1.5 text-xs font-medium transition hover:border-brand-700 hover:text-brand-700 dark:hover:border-brand-100 dark:hover:text-brand-100"
                        >
                          {tag.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <BestTime months={bestTime.months} seasons={bestTime.seasons} />

            <LocationCard place={destination} placeLabel={place} />

            {destination.city_id !== null && destination.cities && (
              <Suspense fallback={null}>
                <NearbyEvents
                  cityId={destination.city_id}
                  cityName={destination.cities.name}
                />
              </Suspense>
            )}

            <Suspense fallback={<ReviewsFallback />}>
              <ReviewsSection
                destinationId={destination.id}
                average={destination.avg_rating}
              />
            </Suspense>
          </div>

          <aside id="rencana" className="scroll-mt-24 lg:sticky lg:top-24">
            <PlanCard
              destination={destination}
              crowd={crowd}
              bestMonths={bestTime.months}
            />
            <p className="mt-3 px-1 text-[11px] leading-snug text-muted-foreground">
              Angka kepadatan berasal dari statistik kunjungan provinsi periode
              terakhir, bukan hitungan pengunjung harian destinasi ini.
            </p>
          </aside>
        </div>
      </div>

      <Suspense fallback={null}>
        <SimilarRail
          destinationId={destination.id}
          tagSlugs={destination.tags.map((tag) => tag.slug)}
          provinceId={destination.province_id}
          provinceName={destination.provinces?.name ?? null}
        />
      </Suspense>

      <MobileBar
        rating={destination.avg_rating}
        views={destination.view_count}
      />

      <p className="container-page pb-8 text-xs text-muted-foreground">
        Halaman ini sudah dilihat {formatCount(destination.view_count)} kali.
      </p>
    </>
  );
}

function ReviewsFallback() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
