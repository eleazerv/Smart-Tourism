import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cacheLife } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getSeasonalRecommendations,
  type SeasonalRecommendations,
} from "@/lib/api";
import { coverImage } from "@/lib/home-data";
import { dominantSeason } from "@/lib/recommendations-data";
import { LoadError } from "@/components/home/load-error";
import { Rail } from "@/components/home/rail";
import { Section } from "@/components/home/section";

async function loadSeasonal() {
  "use cache";
  // The API defaults to the current month, so an entry must not outlive one.
  cacheLife("days");
  return getSeasonalRecommendations();
}

export async function SeasonalRail() {
  const t = await getTranslations("home.seasonal");
  const common = await getTranslations("common");
  const locale = await getLocale();

  let recommendations: SeasonalRecommendations;
  try {
    recommendations = await loadSeasonal();
  } catch {
    return (
      <Section title={t("titleFallback")}>
        <LoadError what={t("loadErrorWhat")} />
      </Section>
    );
  }

  const { month, season_info, destinations } = recommendations;
  if (destinations.length === 0) return null;

  // Nama bulan diambil dari Intl, bukan daftar kata di `recommendations-data`,
  // supaya ikut bahasa yang sedang dipakai tanpa kamus tambahan.
  const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
  // Nationally the months split across two seasons, so the honest summary is
  // the one most provinces are in — not a list of every season on the map.
  const season = dominantSeason(season_info);

  return (
    <Section
      title={t("title", { month: name })}
      subtitle={season ? t("season", { season }) : undefined}
      action={{ label: common("seeAll"), href: "/recommendations" }}
    >
      <Rail label={t("railLabel", { month: name })}>
        {destinations.map((destination) => (
          <Link
            key={destination.id}
            href={`/destinations/${destination.id}`}
            // The caption sits over the photo here, so the card *is* the media.
            data-rail-media
            className="group relative aspect-[3/4] w-[60%] shrink-0 snap-start overflow-hidden rounded-2xl bg-brand-700 sm:w-[40%] lg:aspect-[4/3] lg:w-[calc(25%-0.75rem)]"
          >
            <Image
              src={coverImage(destination, 600, 800)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 60vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-brand-900/45"
            />
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block font-display text-lg font-bold text-white">
                {destination.name}
              </span>
              <span className="block text-xs text-white/80">
                {destination.provinces?.name ?? destination.category}
              </span>
            </span>
          </Link>
        ))}
      </Rail>
    </Section>
  );
}
