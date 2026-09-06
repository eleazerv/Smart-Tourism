import Link from "next/link";
import { MONTHS, MONTHS_SHORT } from "@/lib/destination-data";
import { cn } from "@/lib/utils";

/**
 * Twelve months as one row, with a subset marked.
 *
 * Shared by the destination page's "waktu terbaik berkunjung" and the
 * province outlook on `/recommendations`, which were drifting into two
 * different answers to the same question — one a strip, one a sentence.
 *
 * Pass `hrefFor` to turn the cells into links; the strip then doubles as the
 * month switcher, which is what a reader tries to click anyway.
 */
export function MonthStrip({
  active,
  currentMonth,
  activeLabel,
  inactiveLabel,
  hrefFor,
}: {
  /** Month numbers, 1–12, to mark as the good ones. */
  active: number[];
  currentMonth: number;
  /** What a marked month means, e.g. "Waktu terbaik" or "Kemarau". */
  activeLabel: string;
  inactiveLabel: string;
  hrefFor?: (month: number) => string;
}) {
  const set = new Set(active);

  return (
    <>
      <ul className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {MONTHS_SHORT.map((short, i) => {
          const month = i + 1;
          const good = set.has(month);
          const now = month === currentMonth;

          const className = cn(
            "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center text-xs font-semibold",
            good
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-border bg-card text-muted-foreground",
            // Sits outside the border, so it reads the same over a filled
            // month and an empty one.
            now && "ring-2 ring-foreground/50 ring-offset-2 ring-offset-background",
            hrefFor &&
              "transition hover:border-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2",
          );

          const label = `${MONTHS[i]}: ${good ? activeLabel : inactiveLabel}${
            now ? ", bulan berjalan" : ""
          }`;

          const body = (
            <>
              <span>{short}</span>
              {/* Bentuk, bukan cuma warna: satu-satunya pembeda tadi adalah
                  isian brand, yang hilang begitu halaman dicetak hitam-putih
                  atau dibaca mata yang sulit membedakan warna. */}
              <Mark good={good} />
            </>
          );

          return (
            <li key={short}>
              {hrefFor ? (
                <Link
                  href={hrefFor(month)}
                  aria-label={label}
                  aria-current={now ? "page" : undefined}
                  className={className}
                >
                  {body}
                </Link>
              ) : (
                <div title={MONTHS[i]} aria-label={label} className={className}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="grid h-4 w-4 place-items-center rounded-md border border-brand-700 bg-brand-700 text-white"
          >
            <Mark good />
          </span>
          {activeLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="grid h-4 w-4 place-items-center rounded-md border border-border bg-card"
          >
            <Mark good={false} />
          </span>
          {inactiveLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-4 w-4 rounded-md border border-border bg-card ring-2 ring-foreground/50 ring-offset-1 ring-offset-background"
          />
          Bulan berjalan ({MONTHS[currentMonth - 1]})
        </li>
      </ul>
    </>
  );
}

/** Titik penuh untuk bulan yang ditandai, garis untuk sisanya. */
function Mark({ good }: { good: boolean }) {
  return good ? (
    <svg aria-hidden="true" viewBox="0 0 8 8" className="h-1.5 w-1.5 fill-current">
      <circle cx="4" cy="4" r="4" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className="h-1.5 w-1.5 stroke-current opacity-50"
    >
      <line x1="1" y1="4" x2="7" y2="4" strokeWidth="1.5" />
    </svg>
  );
}
