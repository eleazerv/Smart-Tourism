"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  FilterGroups,
  type FilterGroupsProps,
} from "@/components/destinations/filter-groups";

/**
 * Mobile counterpart to the sidebar: the same facets in a bottom sheet.
 * Desktop keeps the column, so this whole control hides above `lg`.
 */
export function FilterDrawer({
  activeCount,
  ...groups
}: Omit<FilterGroupsProps, "onPick"> & { activeCount: number }) {
  const [open, setOpen] = useState(false);

  // A sheet over the results should not let the page scroll behind it, and
  // Escape is the expected way out.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white dark:bg-brand-100 dark:text-brand-900">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Tutup filter"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-brand-900/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Saring hasil"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5 pb-8 shadow-pop"
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-2 mx-auto h-1 w-10 rounded-full bg-border"
              />
              <span className="sr-only">Saring hasil</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup filter"
                className="ml-auto grid h-9 w-9 place-items-center rounded-full transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FilterGroups {...groups} onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
