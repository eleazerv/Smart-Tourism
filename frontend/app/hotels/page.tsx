import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { FilterDrawer } from "@/components/catalogue/filter-drawer";
import { Pagination } from "@/components/catalogue/pagination";
import { SampleDataNotice, SearchHero } from "@/components/catalogue/search-hero";
import { SortSelect } from "@/components/catalogue/sort-select";
import { StayFilters } from "@/components/stays/stay-filters";
import { StayRow } from "@/components/stays/stay-row";
import { StaySearchPanel } from "@/components/stays/stay-search-panel";
import { ListingSkeleton } from "@/components/catalogue/listing-skeleton";
import { STAY_CITIES, allStays, type Stay } from "@/lib/stay-data";
import {
  PAGE_SIZE,
  SORTS,
  activeFilterCount,
  applyFilters,
  facilityFacets,
  formatDateLabel,
  nightCount,
  parseStaySearch,
  sortStays,
  starFacets,
  toHref,
  typeFacets,
  withFilter,
  type RawSearchParams,
  type StaySearchState,
} from "@/lib/stays-search";

type PageProps = { searchParams: Promise<RawSearchParams> };

export const metadata: Metadata = {
  title: "Hotel & Penginapan",
  description:
    "Cari hotel, resor, vila, dan homestay di kota-kota wisata Indonesia. Bandingkan harga per malam, rating tamu, dan fasilitas sebelum memilih.",
  openGraph: {
    title: "Hotel & Penginapan",
    description:
      "Cari hotel, resor, vila, dan homestay di kota-kota wisata Indonesia.",
    type: "website",
  },
};

export default function HotelsPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* searchParams is dynamic, so the whole search streams in behind one
            boundary while the shell stays static. */}
        <Suspense fallback={<ListingSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Results({ searchParams }: PageProps) {
  const state = parseStaySearch(await searchParams);

  const city = STAY_CITIES.find((entry) => entry.id === state.cityId) ?? null;

  // The city narrows the pool the facets are counted over; every other filter
  // is applied after, so the sidebar always shows the alternatives within the
  // chosen city rather than a set of dead ends.
  const pool = allStays().filter(
    (stay) => state.cityId === null || stay.cityId === state.cityId,
  );
  const matched = applyFilters(pool, state);

  const totalPages = Math.max(Math.ceil(matched.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  const results = sortStays(matched, state.sort).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const nights = nightCount(state);
  const filters = (
    <StayFilters
      state={state}
      resetHref={withFilter(state, {
        types: [],
        stars: [],
        facilities: [],
        minScore: 0,
        maxPrice: null,
      })}
      typeCounts={typeFacets(pool)}
      starCounts={starFacets(pool)}
      facilityCounts={facilityFacets(pool)}
    />
  );

  return (
    <>
      <SearchHero
        title={
          city ? `Hotel di ${city.name}` : "Hotel & penginapan di Indonesia"
        }
        subtitle={
          city
            ? `Pilihan menginap di ${city.name}, ${city.province} untuk ${formatDateLabel(state.checkIn)} – ${formatDateLabel(state.checkOut)} (${nights} malam).`
            : "Dari homestay di dekat kawah sampai resor tepi pantai. Bandingkan harga per malam, rating tamu, dan fasilitas di kota-kota wisata Indonesia."
        }
        seed={city ? `hotel-${city.name}` : "hotel-lobby-nusantara"}
        crumbs={[
          { label: "Beranda", href: "/" },
          ...(city
            ? [{ label: "Hotel", href: "/hotels" }, { label: city.name }]
            : [{ label: "Hotel" }]),
        ]}
      >
        <StaySearchPanel state={state} cities={STAY_CITIES} />
      </SearchHero>

      <div className="container-page grid items-start gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:sticky lg:top-24 lg:block">{filters}</aside>

        <div className="min-w-0 space-y-5">
          <SampleDataNotice what="Tarif, rating, dan ketersediaan kamar" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {matched.length === 0 ? (
                "Tidak ada penginapan yang cocok"
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {matched.length}
                  </span>{" "}
                  penginapan{city ? ` di ${city.name}` : ""} &middot; {nights}{" "}
                  malam, {state.guests} tamu
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <FilterDrawer activeCount={activeFilterCount(state)}>
                {filters}
              </FilterDrawer>
              <SortSelect
                id="stay-sort"
                value={state.sort}
                options={SORTS.map((sort) => ({
                  value: sort.key,
                  label: sort.label,
                  href: withFilter(state, { sort: sort.key }),
                }))}
              />
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyStays state={state} />
          ) : (
            <div className="space-y-4">
              {results.map((stay, i) => (
                <StayRow
                  key={stay.id}
                  stay={stay}
                  nights={nights}
                  rooms={state.rooms}
                  destinationsHref={destinationsHrefFor(stay)}
                  priority={i < 2}
                />
              ))}
            </div>
          )}

          <Pagination
            current={page}
            totalPages={totalPages}
            hrefFor={(next) => withFilter(state, { page: next })}
          />
        </div>
      </div>
    </>
  );
}

/**
 * Sends the reader to the real catalogue for the city they are looking at —
 * the destinations API is the part of this page that is actually backed by
 * data, so it is where "what is there to do" gets answered.
 */
function destinationsHrefFor(stay: Stay): string {
  return `/destinations?q=${encodeURIComponent(stay.cityName)}`;
}

function EmptyStays({ state }: { state: StaySearchState }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/50 dark:text-brand-50"
      >
        <Compass className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
        Belum ada penginapan yang cocok
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Coba longgarkan filter harga atau fasilitas, atau cari di seluruh kota.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {activeFilterCount(state) > 0 && (
          <Link
            href={withFilter(state, {
              types: [],
              stars: [],
              facilities: [],
              minScore: 0,
              maxPrice: null,
            })}
            className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
          >
            Hapus semua filter
          </Link>
        )}
        {state.cityId !== null && (
          <Link
            href={withFilter(state, { cityId: null })}
            className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
          >
            Cari di seluruh kota
          </Link>
        )}
        <Link
          href={toHref({ ...state, cityId: null, page: 1 })}
          className="inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          Lihat semua penginapan
        </Link>
      </div>
    </div>
  );
}
