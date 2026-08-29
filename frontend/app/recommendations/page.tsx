import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  getHeatmap,
  getReviewCounts,
  getSeasonalRecommendations,
  type HeatmapEntry,
  type ProvinceRef,
  type SeasonalRecommendations,
} from "@/lib/api";
import type { RawSearchParams } from "@/lib/destinations-search";
import {
  isDrySeason,
  monthName,
  parseTiming,
  rankQuietAndDry,
  withCrowding,
  type TimingState,
} from "@/lib/recommendations-data";
import { LoadError } from "@/components/home/load-error";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { ResultTile } from "@/components/destinations/result-card";
import { SeasonBoard } from "@/components/recommendations/season-board";
import { TimingCard } from "@/components/recommendations/timing-card";
import { TimingHero } from "@/components/recommendations/timing-hero";
import { TimingSkeleton } from "@/components/recommendations/timing-skeleton";

type PageProps = { searchParams: Promise<RawSearchParams> };

/** Quiet-and-dry provinces shown before the full season board. */
const SHORTLIST = 6;

async function loadTiming(
  state: TimingState,
): Promise<SeasonalRecommendations> {
  "use cache";
  // Climate patterns are static and the destination picks move slowly, but an
  // entry must not outlive the month it describes.
  cacheLife("days");
  return getSeasonalRecommendations({
    month: state.month,
    province_id: state.provinceId ?? undefined,
  });
}

async function loadHeatmap(): Promise<HeatmapEntry[]> {
  "use cache";
  cacheLife("hours");
  try {
    return await getHeatmap();
  } catch {
    // Crowding is one badge among several — degrade to "no data" rather than
    // taking the page down with it.
    return [];
  }
}

/** Review totals for the cards on screen; `{}` when the call fails. */
async function loadReviewCounts(ids: string[]): Promise<Record<string, number>> {
  try {
    return await getReviewCounts(ids);
  } catch {
    // The count is a parenthetical next to the stars, not the page — drop it
    // rather than fail the whole listing over it.
    return {};
  }
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const state = parseTiming(await searchParams);
  const name = monthName(state.month);

  const title = `Waktu terbaik berkunjung — ${name}`;
  const description = `Musim tiap provinsi di bulan ${name}, dipadukan dengan statistik kunjungan terakhir, untuk menemukan daerah yang cuacanya bagus tapi belum ramai.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    // Every month is the same page with a different filter; the bare page is
    // the canonical entry point.
    alternates: { canonical: "/recommendations" },
  };
}

export default function RecommendationsPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* searchParams is dynamic, so everything derived from the month —
            the hero heading included — streams in behind one boundary while
            the shell stays static. */}
        <Suspense fallback={<TimingSkeleton />}>
          <Timing searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Timing({ searchParams }: PageProps) {
  const state = parseTiming(await searchParams);

  let recommendations: SeasonalRecommendations;
  try {
    recommendations = await loadTiming(state);
  } catch {
    return (
      <div className="container-page py-16">
        <LoadError what="Rekomendasi waktu terbaik" />
      </div>
    );
  }

  const heatmap = await loadHeatmap();
  const { season_info: info, destinations } = recommendations;
  const reviewCounts = await loadReviewCounts(destinations.map((d) => d.id));

  const name = monthName(state.month);
  const timings = withCrowding(info, heatmap);
  const quiet = rankQuietAndDry(timings);
  const dryCount = info.filter((entry) => isDrySeason(entry.season)).length;

  // With a province filter the API answers with just that one climate row, so
  // it doubles as the label for the whole page.
  const province: ProvinceRef | null =
    state.provinceId !== null ? (info[0]?.province ?? null) : null;

  return (
    <>
      <TimingHero
        state={state}
        dryCount={dryCount}
        provinceCount={info.length}
        province={province}
        season={info[0]?.season ?? null}
      />

      <div className="container-page space-y-10 py-8 sm:py-10">
        {info.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Belum ada pola iklim yang tercatat untuk bulan {name}
            {province ? ` di ${province.name}` : ""}.
          </p>
        ) : (
          <>
            <section>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                {province
                  ? `${province.name} di bulan ${name}`
                  : `Cuaca bagus, belum ramai — ${name}`}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {province
                  ? "Musim dan tingkat kepadatan provinsi ini pada periode terakhir."
                  : "Provinsi yang sedang musim kemarau, diurutkan dari yang kunjungannya paling sedikit. Provinsi yang sedang musim hujan tidak masuk daftar ini."}
              </p>

              {quiet.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {province
                    ? `${province.name} sedang musim hujan di bulan ${name}.`
                    : `Tidak ada provinsi yang sedang kemarau di bulan ${name}.`}
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {quiet.slice(0, SHORTLIST).map((timing, index) => (
                    <TimingCard
                      key={timing.info.province.code}
                      timing={timing}
                      state={state}
                      rank={province ? undefined : index + 1}
                    />
                  ))}
                </div>
              )}
            </section>

            {!province && (
              <section>
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Musim di seluruh provinsi
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Pilih provinsi untuk melihat kegiatan yang cocok dan
                  destinasinya di bulan {name}.
                </p>
                <div className="mt-4">
                  <SeasonBoard info={info} state={state} />
                </div>
              </section>
            )}
          </>
        )}

        <section>
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Destinasi pilihan bulan {name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Dipilih dari kegiatan yang cocok dengan musim
            {province ? ` di ${province.name}` : " bulan ini"}, diurutkan dari
            yang paling banyak dilihat.
          </p>

          {destinations.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada destinasi yang cocok untuk bulan ini.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination, index) => (
                <ResultTile
                  key={destination.id}
                  destination={destination}
                  reviews={reviewCounts[destination.id]}
                  priority={index < 3}
                />
              ))}
            </div>
          )}
        </section>

        {/* The page answers "when"; the map answers "where". */}
        <Link
          href="/peta"
          className="flex flex-col gap-2 rounded-2xl bg-brand-900 p-5 text-brand-50 transition hover:bg-brand-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="flex items-center gap-2 font-display text-base font-bold">
              <Sparkles className="h-4 w-4 text-brand-100" />
              Susun rutenya di peta
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-brand-100/85">
              Rangkai provinsi-provinsi ini jadi satu rencana perjalanan,
              lengkap dengan rekomendasi tiap perhentian.
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-brand-100" />
        </Link>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Musim berasal dari pola iklim per provinsi, dan tingkat kepadatan
          dari statistik kunjungan provinsi periode terakhir — bukan hitungan
          pengunjung harian tiap destinasi.
        </p>
      </div>
    </>
  );
}
