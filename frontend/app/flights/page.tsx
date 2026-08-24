import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftRight, PlaneTakeoff } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { FilterDrawer } from "@/components/catalogue/filter-drawer";
import { ListingSkeleton } from "@/components/catalogue/listing-skeleton";
import { Pagination } from "@/components/catalogue/pagination";
import { SampleDataNotice, SearchHero } from "@/components/catalogue/search-hero";
import { SortSelect } from "@/components/catalogue/sort-select";
import { FlightFilters } from "@/components/flights/flight-filters";
import { FlightRow } from "@/components/flights/flight-row";
import { FlightSearchPanel } from "@/components/flights/flight-search-panel";
import { AIRPORTS, airport, flightsFor } from "@/lib/flight-data";
import { formatIDR } from "@/lib/seeded-random";
import {
  PAGE_SIZE,
  SORTS,
  activeFilterCount,
  airlineFacets,
  applyFilters,
  formatDateLabel,
  parseFlightSearch,
  sortFlights,
  stopFacets,
  swappedHref,
  windowFacets,
  withFilter,
  type FlightSearchState,
  type RawSearchParams,
} from "@/lib/flights-search";

type PageProps = { searchParams: Promise<RawSearchParams> };

export const metadata: Metadata = {
  title: "Tiket Pesawat",
  description:
    "Bandingkan jadwal dan harga penerbangan domestik antarkota di Indonesia — durasi, transit, maskapai, dan bagasi dalam satu daftar.",
  openGraph: {
    title: "Tiket Pesawat",
    description:
      "Bandingkan jadwal dan harga penerbangan domestik antarkota di Indonesia.",
    type: "website",
  },
};

export default function FlightsPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* searchParams is dynamic, so the whole board streams in behind one
            boundary while the shell stays static. */}
        <Suspense fallback={<ListingSkeleton />}>
          <Board searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Board({ searchParams }: PageProps) {
  const state = parseFlightSearch(await searchParams);

  const from = airport(state.from);
  const to = airport(state.to);

  // An unknown airport code in the URL is a bad request, not an empty day.
  if (!from || !to) return <UnknownRoute state={state} />;

  const pool = flightsFor(state.from, state.to, state.date, state.cabin);
  const matched = applyFilters(pool, state);

  const totalPages = Math.max(Math.ceil(matched.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  const results = sortFlights(matched, state.sort).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const cheapest = matched.reduce<number | null>(
    (low, flight) => (low === null || flight.price < low ? flight.price : low),
    null,
  );

  const filters = (
    <FlightFilters
      state={state}
      resetHref={withFilter(state, {
        airlines: [],
        windows: [],
        maxStops: null,
      })}
      airlineCounts={airlineFacets(pool)}
      windowCounts={windowFacets(pool)}
      stopCounts={stopFacets(pool)}
    />
  );

  return (
    <>
      <SearchHero
        title={`Tiket pesawat ${from.city} ke ${to.city}`}
        subtitle={`${formatDateLabel(state.date)} · ${state.passengers} penumpang · kelas ${state.cabin}. Bandingkan jadwal, durasi, dan bagasi sebelum memilih.`}
        seed={`flight-${from.code}-${to.code}`}
        crumbs={[
          { label: "Beranda", href: "/" },
          { label: "Tiket Pesawat", href: "/flights" },
          { label: `${from.code} – ${to.code}` },
        ]}
      >
        <FlightSearchPanel state={state} airports={AIRPORTS} />
      </SearchHero>

      <div className="container-page grid items-start gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:sticky lg:top-24 lg:block">{filters}</aside>

        <div className="min-w-0 space-y-5">
          <SampleDataNotice what="Jadwal, harga, dan ketersediaan kursi" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground" aria-live="polite">
              {matched.length === 0 ? (
                "Tidak ada penerbangan yang cocok"
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {matched.length}
                  </span>{" "}
                  penerbangan
                  {cheapest !== null && (
                    <>
                      {" "}
                      &middot; mulai{" "}
                      <span className="font-semibold text-foreground">
                        {formatIDR(cheapest)}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={swappedHref(state)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Balik rute
              </Link>
              <FilterDrawer activeCount={activeFilterCount(state)}>
                {filters}
              </FilterDrawer>
              <SortSelect
                id="flight-sort"
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
            <NoFlights state={state} />
          ) : (
            <div className="space-y-3">
              {results.map((flight) => (
                <FlightRow
                  key={flight.id}
                  flight={flight}
                  passengers={state.passengers}
                  // The destinations catalogue is the part of this page with
                  // real data behind it, so that is where "and then what" goes.
                  exploreHref={`/destinations?q=${encodeURIComponent(to.city)}`}
                  exploreLabel={`Jelajahi ${to.city}`}
                />
              ))}
            </div>
          )}

          <Pagination
            current={page}
            totalPages={totalPages}
            hrefFor={(next) => withFilter(state, { page: next })}
          />

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Durasi dan estimasi harga dihitung dari jarak sebenarnya antara{" "}
            {from.name} ({from.code}) dan {to.name} ({to.code}).
          </p>
        </div>
      </div>
    </>
  );
}

function NoFlights({ state }: { state: FlightSearchState }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-700/50 dark:text-brand-50"
      >
        <PlaneTakeoff className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
        Tidak ada penerbangan yang cocok
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Coba longgarkan filter waktu berangkat atau izinkan penerbangan dengan
        transit.
      </p>
      <Link
        href={withFilter(state, { airlines: [], windows: [], maxStops: null })}
        className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        Hapus semua filter
      </Link>
    </div>
  );
}

function UnknownRoute({ state }: { state: FlightSearchState }) {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Rute tidak dikenal
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Kode bandara {state.from} atau {state.to} tidak ada dalam daftar yang
        dilayani halaman ini.
      </p>
      <Link
        href="/flights"
        className="mt-6 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        Mulai pencarian baru
      </Link>
    </div>
  );
}
