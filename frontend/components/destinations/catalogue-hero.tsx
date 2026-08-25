import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import type { Tag } from "@/lib/api";
import { photo } from "@/lib/home-data";
import {
  withFilter,
  withTagToggled,
  type SearchState,
} from "@/lib/destinations-search";
import { CatalogueSearch } from "@/components/destinations/catalogue-search";
import { cn } from "@/lib/utils";

export type HeroCopy = {
  title: string;
  subtitle: string;
  /** Seed for the backdrop, so the same filter always gets the same photo. */
  seed: string;
  /** Trail shown above the title; the last entry is the current page. */
  crumbs: { label: string; href?: string }[];
};

export function CatalogueHero({
  state,
  copy,
  total,
  provinceCount,
}: {
  state: SearchState;
  copy: HeroCopy;
  total: number;
  provinceCount: number;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-900">
      <Image
        src={photo(copy.seed, 1600, 700)}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Two stops: a wash for legibility, and a heavier foot so the search
          card keeps its contrast whatever the photo underneath does. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/85 to-brand-900/55"
      />

      <div className="container-page relative py-8 sm:py-12">
        <nav aria-label="Remah roti">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-brand-100/80">
            {copy.crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="underline-offset-2 transition hover:text-white hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-100/90 sm:text-base">
          {copy.subtitle}
        </p>

        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-brand-100">
          {total.toLocaleString("id-ID")} destinasi terkurasi
          <Stat icon={MapPinned}>{provinceCount} provinsi</Stat>
          <Stat icon={ShieldCheck}>Kepadatan dari data kunjungan BPS</Stat>
        </ul>

        <div className="mt-6 max-w-2xl">
          <CatalogueSearch state={state} />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </li>
  );
}

/**
 * Quick tag switcher pinned under the site header. The sidebar holds the same
 * slugs, but on a long results page this row keeps the one filter people
 * actually change within reach.
 */
export function TagChips({
  state,
  tags,
}: {
  state: SearchState;
  tags: Tag[];
}) {
  return (
    <div className="sticky top-16 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page">
        <ul
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-3"
          aria-label="Jenis destinasi populer"
        >
          <li>
            {/* Clears every tag but keeps the search, province and rating —
                this row switches the type of place, not the whole query. */}
            <Link
              href={withFilter(state, { tags: [] })}
              className={cn(
                "inline-block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                state.tags.length === 0
                  ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                  : "border-border bg-card hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15",
              )}
            >
              Semua
            </Link>
          </li>
          {tags.map((tag) => {
            const active = state.tags.includes(tag.slug);
            return (
              <li key={tag.id}>
                <Link
                  href={withTagToggled(state, tag.slug)}
                  aria-pressed={active}
                  className={cn(
                    "inline-block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                      : "border-border bg-card hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15",
                  )}
                >
                  {tag.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
