import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page numbers rendered around the current one before the gaps collapse. */
const WINDOW = 1;

/**
 * Numbered pager shared by every listing page. Long result sets collapse to
 * `1 … 4 5 6 … 13` so the control keeps a fixed width no matter how many pages
 * the filters matched.
 */
function pageList(current: number, total: number): (number | "gap")[] {
  const pages = new Set<number>([1, total]);
  for (let i = current - WINDOW; i <= current + WINDOW; i++) {
    if (i > 1 && i < total) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];

  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push("gap");
    out.push(page);
  });

  return out;
}

export function Pagination({
  current,
  totalPages,
  hrefFor,
}: {
  current: number;
  totalPages: number;
  /** Turns a page number into a URL; each listing owns its own query shape. */
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(current, 1), totalPages);

  return (
    <nav
      aria-label="Navigasi halaman hasil"
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      <Step
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        label="Halaman sebelumnya"
        side="prev"
      />

      {pageList(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-muted-foreground"
          >
            &hellip;
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-label={`Halaman ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm font-medium tabular-nums transition",
              entry === page
                ? "bg-brand-700 text-white dark:bg-brand-100 dark:text-brand-900"
                : "border border-border bg-card hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <Step
        href={hrefFor(page + 1)}
        disabled={page >= totalPages}
        label="Halaman berikutnya"
        side="next"
      />
    </nav>
  );
}

function Step({
  href,
  disabled,
  label,
  side,
}: {
  href: string;
  disabled: boolean;
  label: string;
  side: "prev" | "next";
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight;

  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground opacity-40"
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
