"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export type SortOption = {
  value: string;
  label: string;
  /** Precomputed by the server component — client props must stay serialisable. */
  href: string;
};

/** Native select — the platform control beats a custom menu on mobile. */
export function SortSelect({
  value,
  options,
  id = "catalogue-sort",
}: {
  value: string;
  options: SortOption[];
  /** Unique per page, so two sorts on one screen keep distinct labels. */
  id?: string;
}) {
  const router = useRouter();

  return (
    <div className="relative inline-flex items-center gap-2 rounded-full border border-border bg-card pl-3.5 pr-2 text-sm shadow-sm">
      <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      <label htmlFor={id} className="sr-only">
        Urutkan hasil
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find(
            (option) => option.value === event.target.value,
          );
          if (next) router.push(next.href);
        }}
        className="cursor-pointer appearance-none bg-transparent py-2 pr-6 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
