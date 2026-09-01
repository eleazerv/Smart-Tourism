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
      {/* frontend lele 
      awal :       <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
       */}
        <ul className="no-scrollbar -mx-1 grid grid-cols-7 sm:gap-2 md: gap-2 lg:gap-0 overflow-x-auto px-1 pb-1">
        {window.map((day) => {
          const active = day.date === selected;
          const best = day.price !== null && day.price === cheapest;

          const content = (
            <div className="margin-auto items-center content-center pt-2">
              <span className="block text-[12px] font-medium uppercase tracking-wide">
                {weekday(day.date)}
              </span>
              <span className="mt-0.5 block text-[15px] font-bold tabular-nums">
                {dayOfMonth(day.date)}
              </span>
              <span
                className={cn(
                  "mt-1 block text-[11px] tabular-nums",
                  active
                    ? "text-current"
                    : best
                      ? "font-bold text-emerald-700 dark:text-emerald-400 text-[11px]"
                      : "text-muted-foreground",
                )}
              >
                {day.price === null ? "—" : shortIDR(day.price)}
              </span>
            </div>
          );

          return (
            <li key={day.date} className="shrink-0">
              {day.price === null || active ? (
                <span
                  aria-current={active ? "date" : undefined}
                  className={cn(
                    "block w-full min-w-[3.5rem] max-w-[5.5rem] rounded-xl border px-2 py-1 text-center aspect-[3/3]",
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
                  className="block w-full  min-w-[3.5rem] max-w-[5.5rem] aspect-[3/3] rounded-xl border border-border bg-card px-2 py-1 text-center transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
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
