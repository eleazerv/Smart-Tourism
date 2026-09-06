import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Compass } from "lucide-react";
import type { Tag } from "@/lib/api";
import {
  formatRating,
  withFilter,
  withTagToggled,
  type SearchState,
} from "@/lib/destinations-search";

/** Suggestions to broaden the query, most likely culprit first. */
type Copy = ReturnType<typeof useTranslations<"catalogue">>;

function loosenings(state: SearchState, tags: Tag[], t: Copy) {
  const options: { label: string; href: string }[] = [];

  if (state.minRating > 0) {
    options.push({
      label: t("loosenRating", { rating: formatRating(state.minRating) }),
      href: withFilter(state, { minRating: 0 }),
    });
  }
  if (state.provinceId !== null) {
    options.push({
      label: t("loosenProvince"),
      href: withFilter(state, { provinceId: null }),
    });
  }
  if (state.tags.length > 1) {
    const last = state.tags[state.tags.length - 1];
    const tag = tags.find((entry) => entry.slug === last);
    options.push({
      label: t("loosenTag", { tag: tag?.name ?? last }),
      href: withTagToggled(state, last),
    });
  }
  if (state.q) {
    options.push({
      label: t("loosenQuery", { q: state.q }),
      href: withFilter(state, { q: "" }),
    });
  }

  return options;
}

export function EmptyResults({
  state,
  tags,
}: {
  state: SearchState;
  tags: Tag[];
}) {
  const t = useTranslations("catalogue");
  const options = loosenings(state, tags, t);

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
      </p>

      {options.length > 0 && (
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {options.map((option) => (
            <li key={option.href}>
              <Link
                href={option.href}
                className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 hover:text-brand-700"
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/destinations"
        className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
      >
        {t("seeAllDestinations")}
      </Link>
    </div>
  );
}
