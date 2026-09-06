import { Link } from "@/i18n/navigation";
import type { FlightCalendarDay } from "@/lib/api";
import { longDate } from "@/lib/calendar";
import { shortIDR } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const DAYS_SHOWN = 7;

/**
 * A week of cheapest fares around the chosen date, from
 * `GET /api/flights/calendar`. Days the API priced at null have nothing
 * flying, so they are shown but not offered as a link.
 *
 * Seven fluid columns rather than a scrolling strip: the whole week has to be
 * comparable at a glance, and a row that scrolls hides exactly the cheap day
 * the reader came to find. Cells stay square from `sm` up, where there is
 * width to spare; on a phone they shrink to content height instead, which
 * keeps the price readable rather than squeezing three lines into 44px.
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
  const t = useTranslations("flights");

  const window = around(days, selected);
  if (window.length === 0) return null;

  const cheapest = window.reduce<number | null>(
    (low, day) =>
      day.price !== null && (low === null || day.price < low) ? day.price : low,
    null,
  );

  return (
    <section aria-label={t("calendarLabel")}>
      <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {window.map((day) => {
          const active = day.date === selected;
          const best = day.price !== null && day.price === cheapest;
          const empty = day.price === null;

          const content = (
            <>
              <span
                className={cn(
                  "text-[10px] font-medium uppercase leading-none tracking-wide sm:text-[11px]",
                  active ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {weekday(day.date)}
              </span>
              <span className="mt-1.5 text-base font-bold leading-none tabular-nums sm:text-lg">
                {dayOfMonth(day.date)}
              </span>
              <span
                className={cn(
                  "mt-1.5 text-[10px] leading-none tabular-nums sm:text-[11px]",
                  active
                    ? "opacity-80"
                    : best
                      ? "font-semibold text-emerald-700"
                      : "text-muted-foreground",
                )}
              >
                {empty ? "—" : shortIDR(day.price!)}
              </span>
            </>
          );

          // Cells share one box so the row keeps a single baseline whatever
          // state each day is in.
          const box =
            "flex min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-2.5 text-center sm:aspect-square sm:py-0";

          return (
            <li key={day.date}>
              {empty || active ? (
                <span
                  aria-current={active ? "date" : undefined}
                  className={cn(
                    box,
                    active
                      ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                      : "border-dashed border-border/70 text-muted-foreground",
                  )}
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={hrefFor(day.date)}
                  aria-label={`${longDate(day.date)}, mulai ${shortIDR(day.price!)}`}
                  className={cn(
                    box,
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    best
                      ? "border-emerald-600/40 bg-emerald-50 hover:border-emerald-600"
                      : "border-border bg-card hover:border-brand-700 hover:bg-brand-tint/10",
                  )}
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
