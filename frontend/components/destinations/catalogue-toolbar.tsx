import Link from "next/link";
import { LayoutGrid, Rows3, X } from "lucide-react";
import type { Tag } from "@/lib/api";
import {
  SORTS,
  formatRating,
  hasFilters,
  withFilter,
  withTagToggled,
  type ProvinceFacet,
  type SearchState,
  type ViewMode,
} from "@/lib/destinations-search";
import { FilterDrawer } from "@/components/catalogue/filter-drawer";
import { SortSelect } from "@/components/catalogue/sort-select";
import { FilterGroups } from "@/components/destinations/filter-groups";
import { cn } from "@/lib/utils";

export function CatalogueToolbar({
  state,
  tags,
  provinces,
  total,
  shown,
}: {
  state: SearchState;
  tags: Tag[];
  provinces: ProvinceFacet[];
  /** Destinations matching every filter. */
  total: number;
  /** How many of them this page renders. */
  shown: number;
}) {
  const activeCount =
    state.tags.length +
    (state.provinceId !== null ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0) +
    (state.q ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total === 0 ? (
            "Tidak ada destinasi yang cocok"
          ) : (
            <>
              Menampilkan{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {shown}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {total.toLocaleString("id-ID")}
              </span>{" "}
              destinasi
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <FilterDrawer activeCount={activeCount}>
            <FilterGroups state={state} tags={tags} provinces={provinces} />
          </FilterDrawer>
          <ViewToggle state={state} />
          <SortSelect
            value={state.sort}
            options={SORTS.map((sort) => ({
              value: sort.key,
              label: sort.label,
              href: withFilter(state, { sort: sort.key }),
            }))}
          />
        </div>
      </div>

      <ActiveChips state={state} tags={tags} provinces={provinces} />
    </div>
  );
}

function ViewToggle({ state }: { state: SearchState }) {
  const options: { mode: ViewMode; label: string; Icon: typeof Rows3 }[] = [
    { mode: "list", label: "Tampilan daftar", Icon: Rows3 },
    { mode: "grid", label: "Tampilan kisi", Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="Tampilan hasil"
      className="hidden items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-sm sm:inline-flex"
    >
      {options.map(({ mode, label, Icon }) => (
        <Link
          key={mode}
          href={withFilter(state, { view: mode })}
          aria-label={label}
          aria-current={state.view === mode ? "true" : undefined}
          className={cn(
            "grid h-8 w-9 place-items-center rounded-full transition",
            state.view === mode
              ? "bg-brand-700 text-white"
              : "text-muted-foreground hover:bg-brand-tint/10",
          )}
        >
          <Icon className="h-4 w-4" />
        </Link>
      ))}
    </div>
  );
}

/**
 * Every active filter as a removable chip. Booking sites put these directly
 * above the results because the sidebar scrolls out of view on long pages,
 * leaving readers unsure why the list looks so short.
 */
function ActiveChips({
  state,
  tags,
  provinces,
}: {
  state: SearchState;
  tags: Tag[];
  provinces: ProvinceFacet[];
}) {
  if (!hasFilters(state)) return null;

  const chips: { key: string; label: string; href: string }[] = [];

  if (state.q) {
    chips.push({
      key: "q",
      label: `Pencarian: ${state.q}`,
      href: withFilter(state, { q: "" }),
    });
  }

  for (const slug of state.tags) {
    const tag = tags.find((entry) => entry.slug === slug);
    chips.push({
      key: `tag-${slug}`,
      label: tag?.name ?? slug,
      href: withTagToggled(state, slug),
    });
  }

  if (state.provinceId !== null) {
    const province = provinces.find((entry) => entry.id === state.provinceId);
    chips.push({
      key: "province",
      label: province?.name ?? `Provinsi ${state.provinceId}`,
      href: withFilter(state, { provinceId: null }),
    });
  }

  if (state.minRating > 0) {
    chips.push({
      key: "rating",
      label: `Rating ${formatRating(state.minRating)}+`,
      href: withFilter(state, { minRating: 0 }),
    });
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            className="inline-flex max-w-56 items-center gap-1.5 rounded-full bg-brand-tint/10 py-1.5 pl-3 pr-2 text-xs font-semibold text-brand-900 transition hover:bg-brand-100"
          >
            <span className="truncate">{chip.label}</span>
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Hapus filter</span>
          </Link>
        </li>
      ))}
      <li>
        <Link
          href="/destinations"
          className="rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground underline-offset-2 transition hover:text-brand-700 hover:underline"
        >
          Hapus semua
        </Link>
      </li>
    </ul>
  );
}
