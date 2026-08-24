import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { Map } from "lucide-react";
import {
  getHeatmap,
  getTags,
  searchDestinations,
  type Destination,
  type HeatmapEntry,
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
import { Pagination } from "@/components/destinations/pagination";
import { ResultRow, ResultTile } from "@/components/destinations/result-card";
import { crowdLevel } from "@/lib/destination-data";
import {
  PAGE_SIZE,
  applyProvince,
  applyRatingFloor,
  parseSearch,
  provinceFacets,
  sortDestinations,
  type RawSearchParams,
  type SearchState,
} from "@/lib/destinations-search";

type PageProps = { searchParams: Promise<RawSearchParams> };

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

async function loadHeatmap(): Promise<HeatmapEntry[]> {
  "use cache";
  cacheLife("hours");
  try {
    return await getHeatmap();
  } catch {
    // Crowding is one column of the card, not the page — degrade to "no data".
    return [];
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

/** Headline, blurb and backdrop for whatever the reader filtered down to. */
function heroCopy(state: SearchState, tags: Tag[]): HeroCopy {
  const names = state.tags.map(
    (slug) => tags.find((tag) => tag.slug === slug)?.name ?? slug,
  );
  const named = names.join(", ");

  if (state.q) {
    return {
      title: `Hasil untuk "${state.q}"`,
      subtitle:
        "Destinasi yang cocok dengan pencarian Anda, lengkap dengan rating pengunjung dan tingkat kepadatan provinsinya.",
      seed: `search-${state.q}`,
      crumbs: [
        { label: "Beranda", href: "/" },
        { label: "Destinasi", href: "/destinations" },
        { label: `Pencarian: ${state.q}` },
      ],
    };
  }

  if (named) {
    // `search_destinations` unions its tag slugs, so several tags widen the
    // list rather than narrowing it — the blurb says "atau" to match.
    const kinds = names
      .map((name) => name.toLowerCase())
      .join(names.length > 2 ? ", " : " atau ");

    return {
      title: `Wisata ${named}`,
      subtitle: `Semua destinasi yang masuk kategori ${kinds} di Indonesia — bandingkan rating, lihat seberapa ramai provinsinya, lalu pilih waktu kunjungan yang paling nyaman.`,
      seed: state.tags.join("-"),
      crumbs: [
        { label: "Beranda", href: "/" },
        { label: "Destinasi", href: "/destinations" },
        { label: named },
      ],
    };
  }

  return {
    title: "Jelajahi destinasi Indonesia",
    subtitle:
      "Dari pantai sampai pusat kota tua. Saring berdasarkan jenis, provinsi, dan rating pengunjung, lalu buka panduannya untuk melihat waktu terbaik berkunjung.",
    seed: "nusantara-archipelago",
    crumbs: [{ label: "Beranda", href: "/" }, { label: "Destinasi" }],
  };
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const state = parseSearch(await searchParams);

  let tags: Tag[] = [];
  try {
    tags = await loadTags();
  } catch {
    tags = [];
  }

  const { title, subtitle } = heroCopy(state, tags);

  return {
    title,
    description: subtitle,
    openGraph: { title, description: subtitle, type: "website" },
    // Filtered permutations are navigation, not content worth indexing
    // separately; the bare catalogue is the canonical entry point.
    alternates: { canonical: "/destinations" },
  };
}

export default function DestinationsPage({ searchParams }: PageProps) {
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

async function Catalogue({ searchParams }: PageProps) {
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
        <LoadError what="Katalog destinasi" />
      </div>
    );
  }

  const heatmap = await loadHeatmap();
  const copy = heroCopy(state, tags);

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
        <aside className="hidden lg:sticky lg:top-32 lg:block">
          <FilterGroups state={state} tags={tags} provinces={provinces} />
          <HeatmapPromo />
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
                    crowd={crowdLevel(destination.provinces?.code, heatmap)}
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
                    crowd={crowdLevel(destination.provinces?.code, heatmap)}
                    priority={i < 2}
                  />
                ))}
              </div>
            )}
          </div>

          <Pagination state={state} totalPages={totalPages} />

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Tingkat kepadatan pada setiap kartu berasal dari statistik kunjungan
            provinsi periode terakhir, bukan hitungan pengunjung harian
            destinasi tersebut.
          </p>
        </div>
      </div>
    </>
  );
}

/** Cross-link to the tool that answers the question this list raises next. */
function HeatmapPromo() {
  return (
    <Link
      href="/heatmap"
      className="mt-6 hidden rounded-2xl bg-brand-900 p-4 text-brand-50 transition hover:bg-brand-700 lg:block"
    >
      <Map className="h-5 w-5 text-brand-100" />
      <p className="mt-2 font-display text-sm font-bold leading-snug">
        Lihat peta kepadatan seluruh provinsi
      </p>
      <p className="mt-1 text-xs leading-relaxed text-brand-100/85">
        Bandingkan jumlah kunjungan antarprovinsi sebelum menentukan tujuan.
      </p>
    </Link>
  );
}
