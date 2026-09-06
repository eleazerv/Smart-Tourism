import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { cacheLife } from "next/cache";
import { Compass } from "lucide-react";
import { getAllAccommodations, type Accommodation } from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { FilterDrawer } from "@/components/catalogue/filter-drawer";
import { Pagination } from "@/components/catalogue/pagination";
import { SearchHero } from "@/components/catalogue/search-hero";
import { SortSelect } from "@/components/catalogue/sort-select";
import { StayFilters } from "@/components/stays/stay-filters";
import { StayRow } from "@/components/stays/stay-row";
import { StaySearchPanel } from "@/components/stays/stay-search-panel";
import { ListingSkeleton } from "@/components/catalogue/listing-skeleton";
import { LoadError } from "@/components/home/load-error";
import {
  PAGE_SIZE,
  SORTS,
  activeFilterCount,
  applyFilters,
  cityFacets,
  formatDateLabel,
  nightCount,
  parseStaySearch,
  sortStays,
  stayHref,
  tierFacets,
  toHref,
  withFilter,
  type RawSearchParams,
  type StaySearchState,
} from "@/lib/stays-search";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  params,
}: {
  params: PageProps["params"];
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stays" });
  return {
  title: t("metaTitle"),
  description: t("metaDescription"),
  openGraph: {
    title: t("metaTitle"),
    description: t("ogDescription"),
    type: "website",
  },
  };
}

/**
 * The whole accommodation table, flattened out of its 20-row pages.
 *
 * Fetched whole rather than page by page because the price filter, the sort,
 * and the city facet counts all have to see every row — `/api/accommodations`
 * orders by rating only and cannot filter on price or capacity, so a per-page
 * pass would only rearrange an arbitrary slice. Cached, so the walk is paid
 * once rather than on every search.
 */
async function loadStays(): Promise<Accommodation[]> {
  "use cache";
  cacheLife("hours");
  return getAllAccommodations();
}

export default async function HotelsPage({ params, searchParams }: PageProps) {
  setRequestLocale((await params).locale);
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

async function Results({ searchParams }: Pick<PageProps, "searchParams">) {
  const t = await getTranslations("stays");
  const common = await getTranslations("catalogue");
  const locale = await getLocale();
  const state = parseStaySearch(await searchParams);

  let stays: Accommodation[];
  try {
    stays = await loadStays();
  } catch {
    return (
      <div className="container-page py-16">
        <LoadError what="Daftar penginapan" />
      </div>
    );
  }

  const cities = cityFacets(stays);
  const city = cities.find((entry) => entry.id === state.cityId) ?? null;

  // The city narrows the pool the facets are counted over; every other filter
  // is applied after, so the sidebar always shows the alternatives within the
  // chosen city rather than a set of dead ends.
  const pool = stays.filter(
    (stay) => state.cityId === null || stay.cities?.id === state.cityId,
  );
  const matched = applyFilters(pool, state);

  const totalPages = Math.max(Math.ceil(matched.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  const results = sortStays(matched, state.sort).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const nights = nightCount(state);
  // Everything that describes the stay rather than the property is only said
  // once the reader has actually said it.
  const stayLabel = [
    nights !== null ? t("nights", { count: nights }) : null,
    state.guests !== null ? t("guests", { count: state.guests }) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const resetHref = withFilter(state, { tiers: [], maxPrice: null });
  const filters = (
    <StayFilters
      state={state}
      resetHref={resetHref}
      tierCounts={tierFacets(pool)}
    />
  );

  return (
    <>
      <SearchHero
        title={
          city ? t("heroCity", { city: city.name }) : t("heroAll")
        }
        subtitle={
          city
            ? t("heroCityBlurb", {
                place: city.province ? `${city.name}, ${city.province}` : city.name,
              }) +
              (state.checkIn && state.checkOut
                ? t("heroDated", {
                    from: formatDateLabel(state.checkIn, locale),
                    to: formatDateLabel(state.checkOut, locale),
                    nights: nights!,
                  })
                : t("heroUndated"))
            : t("heroBlurb")
        }
        seed={city ? `hotel-${city.name}` : "hotel-lobby-nusantara"}
        crumbs={[
          { label: common("home"), href: "/" },
          ...(city
            ? [{ label: t("crumb"), href: "/hotels" }, { label: city.name }]
            : [{ label: t("crumb") }]),
        ]}
      >
        <StaySearchPanel state={state} cities={cities} />
      </SearchHero>

      <div className="container-page grid items-start gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-1 scrollbar-quiet">
          {filters}
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {matched.length === 0 ? (
                t("noMatch")
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {matched.length}
                  </span>{" "}
                  {city
                    ? t("countInCity", { city: city.name })
                    : t("countAll")}
                  {stayLabel && ` · ${stayLabel}`}
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
                  label: t(`sort.${sort.key}`),
                  href: withFilter(state, { sort: sort.key }),
                }))}
              />
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyStays state={state} resetHref={resetHref} />
          ) : (
            <div className="space-y-4">
              {results.map((stay, i) => (
                <StayRow
                  key={stay.id}
                  stay={stay}
                  nights={nights}
                  rooms={state.rooms}
                  href={stayHref(state, stay.id)}
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

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {t("priceNote")}
          </p>
        </div>
      </div>
    </>
  );
}

function EmptyStays({
  state,
  resetHref,
}: {
  state: StaySearchState;
  resetHref: string;
}) {
  const t = useTranslations("stays");

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
      >
        <Compass className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
        {t("emptyTitle")}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        {t("emptyBody")}
        {state.guests !== null && t("emptyBodyGuests")}
        {t("emptyBodyTail")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {activeFilterCount(state) > 0 && (
          <Link
            href={resetHref}
            className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10"
          >
            {t("clearFilters")}
          </Link>
        )}
        {state.cityId !== null && (
          <Link
            href={withFilter(state, { cityId: null })}
            className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10"
          >
            {t("searchAllCities")}
          </Link>
        )}
        <Link
          href={toHref({ ...state, cityId: null, page: 1 })}
          className="inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          {t("seeAllStays")}
        </Link>
      </div>
    </div>
  );
}
