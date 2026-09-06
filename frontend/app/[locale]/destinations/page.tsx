import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cacheLife } from "next/cache";
import { Map } from "lucide-react";
import { joinList } from "@/lib/intl";
import {
  getReviewCounts,
  getTags,
  searchDestinations,
  type Destination,
  type Tag,
} from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { LoadError } from "@/components/home/load-error";
import {
  CatalogueHero,
  TagChips,
  type HeroCopy,
} from "@/components/destinations/catalogue-hero";
import { CatalogueSkeleton } from "@/components/destinations/catalogue-skeleton";
import { CatalogueToolbar } from "@/components/destinations/catalogue-toolbar";
import { EmptyResults } from "@/components/destinations/empty-results";
import { FilterGroups } from "@/components/destinations/filter-groups";
import { Pagination } from "@/components/catalogue/pagination";
import { ResultRow, ResultTile } from "@/components/destinations/result-card";
import { loadSavedIds } from "@/lib/saved-destinations";
import {
  PAGE_SIZE,
  applyProvince,
  applyRatingFloor,
  parseSearch,
  provinceFacets,
  sortDestinations,
  withFilter,
  type RawSearchParams,
  type SearchState,
} from "@/lib/destinations-search";
import { setRequestLocale } from "next-intl/server";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

/**
 * Ceiling on the page walk below. The seeded catalogue is 13 pages of 15, so
 * this covers it whole while still bounding one render if the table grows.
 */
const MAX_API_PAGES = 15;

async function loadTags(): Promise<Tag[]> {
  "use cache";
  cacheLife("hours");
  return getTags();
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

/**
 * Every destination matching the filters the API understands, flattened out of
 * its 15-row pages.
 *
 * The catalogue is fetched whole rather than page by page because sorting,
 * the rating floor and the province facet counts all have to see the entire
 * result set — `search_destinations` returns rows in region order and offers
 * no sort of its own, so a per-page sort would only reorder an arbitrary
 * slice. Cached, so the walk is paid once per filter combination.
 */
async function loadPool(filters: {
  q: string;
  tags: string;
}): Promise<Destination[]> {
  "use cache";
  cacheLife("minutes");

  const query = {
    q: filters.q || undefined,
    tags: filters.tags || undefined,
  };

  const first = await searchDestinations({ ...query, page: 1 });
  const pages = Math.min(first.total_pages, MAX_API_PAGES);

  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      searchDestinations({ ...query, page: i + 2 }),
    ),
  );

  return [first, ...rest].flatMap((page) => page.data);
}

type Copy = Awaited<ReturnType<typeof getTranslations<"catalogue">>>;

/** Headline, blurb and backdrop for whatever the reader filtered down to. */
function heroCopy(state: SearchState, tags: Tag[], t: Copy): HeroCopy {
  const names = state.tags.map(
    (slug) => tags.find((tag) => tag.slug === slug)?.name ?? slug,
  );
  const named = names.join(", ");

  if (state.q) {
    return {
      title: t("searchTitle", { q: state.q }),
      subtitle: t("searchSubtitle"),
      seed: `search-${state.q}`,
      crumbs: [
        { label: t("home"), href: "/" },
        { label: t("catalogueCrumb"), href: "/destinations" },
        { label: t("chipSearch", { q: state.q }) },
      ],
    };
  }

  if (named) {
    // `search_destinations` unions its tag slugs, so several tags widen the
    // list rather than narrowing it — the blurb says "atau" to match.
    const kinds = joinList(
      names.map((name) => name.toLowerCase()),
      t("locale"),
      "disjunction",
    );

    return {
      title: t("tagTitle", { tags: named }),
      subtitle: t("tagSubtitle", { kinds }),
      seed: state.tags.join("-"),
      crumbs: [
        { label: t("home"), href: "/" },
        { label: t("catalogueCrumb"), href: "/destinations" },
        { label: named },
      ],
    };
  }

  return {
    title: t("browseTitle"),
    subtitle: t("browseSubtitle"),
    seed: "nusantara-archipelago",
    crumbs: [{ label: t("home"), href: "/" }, { label: t("catalogueCrumb") }],
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalogue" });
  const state = parseSearch(await searchParams);

  let tags: Tag[] = [];
  try {
    tags = await loadTags();
  } catch {
    tags = [];
  }

  const { title, subtitle } = heroCopy(state, tags, t);

  return {
    title,
    description: subtitle,
    openGraph: { title, description: subtitle, type: "website" },
    // Filtered permutations are navigation, not content worth indexing
    // separately; the bare catalogue is the canonical entry point.
    alternates: { canonical: "/destinations" },
  };
}

export default async function DestinationsPage({ params, searchParams }: PageProps) {
  setRequestLocale((await params).locale);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* searchParams is dynamic, so the entire catalogue — hero included,
            since its heading is derived from the filters — streams in behind
            one boundary while the shell stays static. */}
        <Suspense fallback={<CatalogueSkeleton />}>
          <Catalogue searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Catalogue({ searchParams }: Pick<PageProps, "searchParams">) {
  const t = await getTranslations("catalogue");
  const state = parseSearch(await searchParams);

  let tags: Tag[];
  let pool: Destination[];
  try {
    [tags, pool] = await Promise.all([
      loadTags(),
      loadPool({ q: state.q, tags: state.tags.join(",") }),
    ]);
  } catch {
    return (
      <div className="container-page py-16">
        <LoadError what={t("loadErrorWhat")} />
      </div>
    );
  }

  const copy = heroCopy(state, tags, t);

  // Province is filtered here rather than through the API so the facet counts
  // below stay computed over everything the other filters matched — a sidebar
  // that hid the alternatives would be a dead end.
  const provinces = provinceFacets(pool);
  const matched = applyRatingFloor(
    applyProvince(pool, state.provinceId),
    state.minRating,
  );

  const totalPages = Math.max(Math.ceil(matched.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  const results = sortDestinations(matched, state.sort).slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const [reviewCounts, savedIds] = await Promise.all([
    loadReviewCounts(results.map((d) => d.id)),
    loadSavedIds(),
  ]);

  return (
    <>
      <CatalogueHero
        state={state}
        copy={copy}
        total={pool.length}
        provinceCount={provinces.length}
      />

      <TagChips state={state} tags={tags} />

      <div className="container-page grid items-start gap-8 py-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:sticky lg:top-32 lg:block lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-1 scrollbar-quiet">
          <FilterGroups state={state} tags={tags} provinces={provinces} />
          <MapPromo />
        </aside>

        <div className="min-w-0">
          <CatalogueToolbar
            state={state}
            tags={tags}
            provinces={provinces}
            total={matched.length}
            shown={results.length}
          />

          <div className="mt-5">
            {results.length === 0 ? (
              <EmptyResults state={state} tags={tags} />
            ) : state.view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((destination, i) => (
                  <ResultTile
                    key={destination.id}
                    destination={destination}
                    reviews={reviewCounts[destination.id]}
                    saved={savedIds.has(destination.id)}
                    priority={i < 3}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((destination, i) => (
                  <ResultRow
                    key={destination.id}
                    destination={destination}
                    reviews={reviewCounts[destination.id]}
                    saved={savedIds.has(destination.id)}
                    priority={i < 2}
                  />
                ))}
              </div>
            )}
          </div>

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

/** Cross-link to the tool that answers the question this list raises next. */
async function MapPromo() {
  const t = await getTranslations("catalogue");

  return (
    <Link
      href="/peta"
      className="mt-6 hidden rounded-2xl bg-brand-900 p-4 text-brand-50 transition hover:bg-brand-700 lg:block"
    >
      <Map className="h-5 w-5 text-brand-100" />
      <p className="mt-2 font-display text-sm font-bold leading-snug">
        {t("mapPromoTitle")}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-brand-100/85">
        {t("mapPromoBody")}
      </p>
    </Link>
  );
}
