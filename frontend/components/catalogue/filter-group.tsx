"use client";

import { Children, useState } from "react";

/** Rows revealed before the "show all" link kicks in. */
const COLLAPSED = 8;

/**
 * One titled block of facet rows.
 *
 * The rows arrive as children from a server component, and the collapse works
 * by slicing them here — so a long list costs no extra client state and the
 * markup stays server-rendered.
 */
export function FilterGroup({
  title,
  children,
  collapsedCount = COLLAPSED,
}: {
  title: string;
  children: React.ReactNode;
  collapsedCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const rows = Children.toArray(children);
  const shown = expanded ? rows : rows.slice(0, collapsedCount);

  return (
    <section className="border-t border-border pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-0.5">{shown}</ul>
      {rows.length > collapsedCount && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
        >
          {expanded
            ? "Tampilkan lebih sedikit"
            : `Tampilkan semua (${rows.length})`}
        </button>
      )}
    </section>
  );
}
