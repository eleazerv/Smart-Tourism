import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getTags } from "@/lib/api";
import { photo } from "@/lib/home-data";
import { LoadError } from "@/components/home/load-error";
import { Section } from "@/components/home/section";

/** Enough tags to fill two rows of four on desktop. */
const SHOWN = 8;

async function loadTags() {
  "use cache";
  cacheLife("hours");
  return getTags();
}

export async function InterestGrid() {
  const t = await getTranslations("home.interests");
  const common = await getTranslations("common");

  let tags;
  try {
    tags = (await loadTags()).slice(0, SHOWN);
  } catch {
    return (
      <Section title={t("title")}>
        <LoadError what={t("loadErrorWhat")} />
      </Section>
    );
  }

  return (
    <Section
      title={t("title")}
      subtitle={t("subtitle")}
      action={{ label: common("seeAll"), href: "/destinations" }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/destinations?tags=${tag.slug}`}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-700 sm:aspect-[4/3]"
          >
            <Image
              src={photo(tag.slug, 600, 700)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-brand-900/40"
            />
            <span className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-bold leading-tight text-white">
              {tag.name}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
