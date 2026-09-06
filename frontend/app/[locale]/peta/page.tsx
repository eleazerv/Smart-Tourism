import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getAllDestinations, getHeatmap } from "@/lib/api";
import { buildDensityPoints, type DensityPoint } from "@/lib/heatmap-data";
import { buildCityStops, type CityStop } from "@/lib/trip-data";
import { LoadError } from "@/components/home/load-error";
import { SiteHeader } from "@/components/home/site-header";
import { CrowdMapPanel } from "@/components/peta/crowd-map-panel";
import { MapSkeleton } from "@/components/peta/map-skeleton";
import { getTranslations, setRequestLocale } from "next-intl/server";

/** The catalogue is 13 pages of 15; the cap only guards against it growing. */
const CATALOGUE_PAGES = 20;

async function loadMap() {
  "use cache";
  // `GET /api/heatmap` serves a monthly aggregate and the catalogue changes
  // rarely, so both sit behind one long-lived entry rather than 14 requests
  // on every render.
  cacheLife("hours");
  const [entries, destinations] = await Promise.all([
    getHeatmap(),
    getAllDestinations(CATALOGUE_PAGES),
  ]);
  return {
    points: buildDensityPoints(entries),
    stops: buildCityStops(destinations),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

/**
 * A map application, not a page with a map on it: no title block, no footer,
 * and on a wide screen no page scroll at all — the map fills whatever the
 * header leaves behind and the docked panel scrolls on its own.
 */
export default async function HeatmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("map");

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <SiteHeader />
      <main className="min-h-0 flex-1">
        {/* The heading the layout has no room for; screen readers and search
            engines still need it. */}
        <h1 className="sr-only">
          {t("metaTitle")} — {t("metaDescription")}
        </h1>
        <Suspense fallback={<MapSkeleton />}>
          <CrowdMapScreen />
        </Suspense>
      </main>
    </div>
  );
}

async function CrowdMapScreen() {
  const t = await getTranslations("map");

  let points: DensityPoint[];
  let stops: CityStop[];
  try {
    ({ points, stops } = await loadMap());
  } catch {
    return (
      <div className="container-page py-16">
        <LoadError what={t("loadErrorWhat")} />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="container-page py-16">
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {t("noData")}
        </p>
      </div>
    );
  }

  return <CrowdMapPanel points={points} stops={stops} />;
}
