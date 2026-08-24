"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, Star } from "lucide-react";
import type { Tag } from "@/lib/api";
import {
  RATING_STEPS,
  formatRating,
  hasFilters,
  withFilter,
  withTagToggled,
  type ProvinceFacet,
  type SearchState,
} from "@/lib/destinations-search";
import { cn } from "@/lib/utils";

/** Rows revealed before the "show all" link kicks in. */
const COLLAPSED = 8;

export type FilterGroupsProps = {
  state: SearchState;
  tags: Tag[];
  provinces: ProvinceFacet[];
  /** Called after a filter is picked, so the mobile drawer can close itself. */
  onPick?: () => void;
};

/**
 * The facet column. Every control is a link rather than a form input: the
 * results are server-rendered, so a filter is just another URL, and the panel
 * keeps working with JavaScript still loading.
 */
export function FilterGroups({
  state,
  tags,
  provinces,
  onPick,
}: FilterGroupsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          Saring hasil
        </h2>
        {hasFilters(state) && (
          <Link
            href="/destinations"
            onClick={onPick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
          >
            <RotateCcw className="h-3 w-3" />
            Atur ulang
          </Link>
        )}
      </div>

      <Group title="Jenis destinasi" count={tags.length}>
        {(shown) =>
          tags.slice(0, shown).map((tag) => (
            <CheckRow
              key={tag.id}
              href={withTagToggled(state, tag.slug)}
              label={tag.name}
              checked={state.tags.includes(tag.slug)}
              onPick={onPick}
            />
          ))
        }
      </Group>

      {provinces.length > 1 && (
        <Group title="Provinsi" count={provinces.length}>
          {(shown) =>
            provinces.slice(0, shown).map((province) => (
              <CheckRow
                key={province.id}
                href={withFilter(state, {
                  provinceId:
                    state.provinceId === province.id ? null : province.id,
                })}
                label={province.name}
                hint={String(province.count)}
                checked={state.provinceId === province.id}
                onPick={onPick}
              />
            ))
          }
        </Group>
      )}

      <Group title="Rating pengunjung">
        {() =>
          RATING_STEPS.map((step) => (
            <CheckRow
              key={step}
              href={withFilter(state, {
                minRating: state.minRating === step ? 0 : step,
              })}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {formatRating(step)} ke atas
                </span>
              }
              checked={state.minRating === step}
              onPick={onPick}
            />
          ))
        }
      </Group>

      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
        Rating dihitung dari ulasan pengunjung yang sudah masuk. Destinasi baru
        yang belum punya ulasan tidak muncul saat filter rating aktif.
      </p>
    </div>
  );
}

function Group({
  title,
  count = 0,
  children,
}: {
  title: string;
  count?: number;
  children: (shown: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? count : Math.min(COLLAPSED, count);

  return (
    <section className="border-t border-border pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-0.5">{children(shown || count)}</ul>
      {count > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
        >
          {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua (${count})`}
        </button>
      )}
    </section>
  );
}

function CheckRow({
  href,
  label,
  hint,
  checked,
  onPick,
}: {
  href: string;
  label: React.ReactNode;
  hint?: string;
  checked: boolean;
  onPick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onPick}
        aria-pressed={checked}
        className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid h-4 w-4 shrink-0 place-items-center rounded border transition",
            checked
              ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
              : "border-border group-hover:border-brand-700 dark:group-hover:border-brand-100",
          )}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className={cn("min-w-0 flex-1 truncate", checked && "font-semibold")}>
          {label}
        </span>
        {hint && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {hint}
          </span>
        )}
      </Link>
    </li>
  );
}
