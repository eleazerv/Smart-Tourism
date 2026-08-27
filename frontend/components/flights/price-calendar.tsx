import Link from "next/link";
import type { FlightCalendarDay } from "@/lib/api";
import { shortIDR } from "@/lib/format-price";
import { cn } from "@/lib/utils";

const DAYS_SHOWN = 7;

/**
 * A week of cheapest fares around the chosen date, from
 * `GET /api/flights/calendar`. Days the API priced at null have nothing
 * flying, so they are shown but not offered as a link.
 */
export function PriceCalendar({
  days,
  selected,
  hrefFor,
}: {
  days: FlightCalendarDay[];
  selected: string;
  hrefFor: (date: string) => string;
}) {
  const window = around(days, selected);
  if (window.length === 0) return null;

  const cheapest = window.reduce<number | null>(
    (low, day) =>
      day.price !== null && (low === null || day.price < low) ? day.price : low,
    null,
  );

  return (
    <section aria-label="Harga termurah per tanggal">
      <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {window.map((day) => {
          const active = day.date === selected;
          const best = day.price !== null && day.price === cheapest;

          const content = (
            <>
              <span className="block text-[11px] font-medium uppercase tracking-wide">
                {weekday(day.date)}
              </span>
              <span className="mt-0.5 block text-sm font-bold tabular-nums">
                {dayOfMonth(day.date)}
              </span>
              <span
                className={cn(
                  "mt-1 block text-[11px] tabular-nums",
                  active
                    ? "text-current"
                    : best
                      ? "font-semibold text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground",
                )}
              >
                {day.price === null ? "—" : shortIDR(day.price)}
              </span>
            </>
          );

          return (
            <li key={day.date} className="shrink-0">
              {day.price === null || active ? (
                <span
                  aria-current={active ? "date" : undefined}
                  className={cn(
                    "block w-[4.75rem] rounded-xl border px-2 py-2 text-center",
                    active
                      ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                      : "border-dashed border-border text-muted-foreground",
                  )}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={hrefFor(day.date)}
                  className="block w-[4.75rem] rounded-xl border border-border bg-card px-2 py-2 text-center transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Centres the strip on the chosen date, clamped to the month the API sent. */
function around(
  days: FlightCalendarDay[],
  selected: string,
): FlightCalendarDay[] {
  if (days.length <= DAYS_SHOWN) return days;

  const index = days.findIndex((day) => day.date === selected);
  if (index === -1) return days.slice(0, DAYS_SHOWN);

  const start = Math.min(
    Math.max(index - Math.floor(DAYS_SHOWN / 2), 0),
    days.length - DAYS_SHOWN,
  );
  return days.slice(start, start + DAYS_SHOWN);
}

function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
  });
}

function dayOfMonth(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}
