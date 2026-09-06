import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
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
import { loadSavedIds } from "@/lib/saved-destinations";
import type { RawSearchParams } from "@/lib/destinations-search";
import {
  drySeasonMonths,
  isDrySeason,
  parseTiming,
  rankQuietAndDry,
  withCrowding,
  type TimingState,
} from "@/lib/recommendations-data";
import { LoadError } from "@/components/home/load-error";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { ResultTile } from "@/components/destinations/result-card";
import { ProvinceOutlook } from "@/components/recommendations/province-outlook";
import { SeasonBoard } from "@/components/recommendations/season-board";
import { TimingCard } from "@/components/recommendations/timing-card";
import { TimingHero } from "@/components/recommendations/timing-hero";
import { TimingSkeleton } from "@/components/recommendations/timing-skeleton";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { monthName } from "@/lib/intl";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

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

/**
 * The selected province's season in all twelve months.
 *
 * `GET /api/recommendations` answers one month at a time, so a year costs
 * twelve calls — but filtered to one province each is a single climate row,
 * they run in parallel, and the whole thing is cached for days alongside the
 * month view. Only reached when a province is actually selected.
 */
async function loadProvinceYear(provinceId: number): Promise<Map<number, string>> {
  "use cache";
  cacheLife("days");

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = await Promise.all(
    months.map((month) =>
      getSeasonalRecommendations({ month, province_id: provinceId })
        .then((result) => result.season_info[0]?.season ?? null)
        // One missing month should narrow the answer, not lose the other
        // eleven — the panel handles a partial year.
        .catch(() => null),
    ),
  );

  return new Map(
    rows.flatMap((season, i) => (season ? [[i + 1, season] as const] : [])),
  );
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
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "timing" });
  const state = parseTiming(await searchParams);
  const name = monthName(state.month, locale);

  const title = t("metaTitle", { month: name });
  const description = t("metaDescription", { month: name });

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    // Every month is the same page with a different filter; the bare page is
    // the canonical entry point.
    alternates: { canonical: "/recommendations" },
  };
}

export default async function RecommendationsPage({ params, searchParams }: PageProps) {
  setRequestLocale((await params).locale);
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

async function Timing({ searchParams }: Pick<PageProps, "searchParams">) {
  const t = await getTranslations("timing");
  const locale = await getLocale();
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
  const [reviewCounts, savedIds, provinceYear] = await Promise.all([
    loadReviewCounts(destinations.map((d) => d.id)),
    loadSavedIds(),
    state.provinceId !== null
      ? loadProvinceYear(state.provinceId)
      : Promise.resolve(new Map<number, string>()),
  ]);

  const name = monthName(state.month, locale);
  const timings = withCrowding(info, heatmap);
  const quiet = rankQuietAndDry(timings);
  const dryCount = info.filter((entry) => isDrySeason(entry.season)).length;
  const dryMonths = drySeasonMonths(provinceYear);

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
            {province
              ? t("noClimateProvince", { month: name, province: province.name })
              : t("noClimate", { month: name })}
          </p>
        ) : (
          <>
            <section>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                {province
                  ? t("provinceInMonth", {
                      province: province.name,
                      month: name,
                    })
                  : t("goodWeatherQuiet", { month: name })}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {province ? t("provinceBlurb") : t("shortlistBlurb")}
              </p>

              {/* Satu provinsi terpilih selalu punya kartunya sendiri, kemarau
                  atau tidak: menyembunyikannya hanya menyisakan satu baris
                  teks di halaman yang datanya sudah lengkap di tangan. */}
              {province && timings[0] ? (
                <div className="mt-4">
                  <ProvinceOutlook
                    timing={timings[0]}
                    state={state}
                    dryMonths={dryMonths}
                  />
                </div>
              ) : quiet.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("noDryProvinces", { month: name })}
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {quiet.slice(0, SHORTLIST).map((timing, index) => (
                    <TimingCard
                      key={timing.info.province.code}
                      timing={timing}
                      state={state}
                      rank={index + 1}
                    />
                  ))}
                </div>
              )}
            </section>

            {!province && (
              <section>
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {t("allProvincesHeading")}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {t("allProvincesBlurb", { month: name })}
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
            {t("picksHeading", { month: name })}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {province
              ? t("picksBlurbProvince", { province: province.name })
              : t("picksBlurb")}
          </p>

          {destinations.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noPicks")}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination, index) => (
                <ResultTile
                  key={destination.id}
                  destination={destination}
                  reviews={reviewCounts[destination.id]}
                  saved={savedIds.has(destination.id)}
                  priority={index < 3}
                />
              ))}
            </div>
          )}
        </section>

        {/* The page answers "when"; the map answers "where". */}
        <Link
          href="/peta"
          // Putih, bukan --brand-50: nilai itu masih mint pekat (176 100% 92%)
          // dari palet lama, sementara --brand-100 di sekelilingnya sudah
          // dinetralkan jadi abu-abu. Judul kehijauan di antara ikon dan
          // paragraf abu-abu itu yang bikin kartunya terlihat salah warna.
          className="flex flex-col gap-2 rounded-2xl bg-brand-900 p-5 text-white transition hover:bg-brand-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="flex items-center gap-2 font-display text-base font-bold">
              <Sparkles className="h-4 w-4" />
              {t("mapCtaTitle")}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-white/75">
              {t("mapCtaBody")}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-white/70" />
        </Link>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>
      </div>
    </>
  );
}
