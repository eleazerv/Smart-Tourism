"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import {
  SORTS,
  withFilter,
  type SearchState,
  type SortKey,
} from "@/lib/destinations-search";

/** Native select — the platform control beats a custom menu on mobile. */
export function SortSelect({ state }: { state: SearchState }) {
  const router = useRouter();

  return (
    <div className="relative inline-flex items-center gap-2 rounded-full border border-border bg-card pl-3.5 pr-2 text-sm shadow-sm">
      <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      <label htmlFor="catalogue-sort" className="sr-only">
        Urutkan hasil
      </label>
      <select
        id="catalogue-sort"
        value={state.sort}
        onChange={(event) =>
          router.push(withFilter(state, { sort: event.target.value as SortKey }))
        }
        className="cursor-pointer appearance-none bg-transparent py-2 pr-6 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        {SORTS.map((sort) => (
          <option key={sort.key} value={sort.key}>
            {sort.label}
          </option>
        ))}
      </select>
    </div>
  );
}
