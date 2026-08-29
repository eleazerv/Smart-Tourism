"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { FlightCalendarDay } from "@/lib/api";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import { MonthCalendar } from "@/components/ui/month-calendar";
import { longDate, shortDate, weekdayName } from "@/lib/calendar";
import { shortIDR } from "@/lib/format-price";
import { cn } from "@/lib/utils";

/**
 * Departure date as a month calendar with the cheapest fare printed under each
 * day, rather than the browser date control.
 *
 * Prices come from `/api/flight-calendar` — a same-origin passthrough to the
 * flights API — and are fetched per route and month, then kept so paging back
 * and forth does not refetch. The picker still works when they fail to load:
 * it just shows a bare calendar.
 *
 * The panel is portalled to `<body>` and positioned against the trigger rather
 * than nested under it: the search hero clips its overflow, which would cut a
 * calendar that hangs below the form.
 */

/** Enough for six week rows plus the header and footnote. */
const PANEL_WIDTH = 336;
const PANEL_HEIGHT = 420;

export function DatePicker({
  value,
  onChange,
  originCityId,
  destinationCityId,
}: {
  /** `YYYY-MM-DD`. */
  value: string;
  onChange: (date: string) => void;
  /** Null when the airport has no city in the flights API. */
  originCityId: number | null;
  destinationCityId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const [prices, setPrices] = useState<Map<string, number | null>>(new Map());
  const [loading, setLoading] = useState(false);

  // Keyed by route + month, so switching months twice hits the API once.
  const cache = useRef(new Map<string, FlightCalendarDay[]>());

  const routeKey =
    originCityId && destinationCityId
      ? `${originCityId}-${destinationCityId}`
      : null;

  // The chosen date moving to another month (a new search, say) follows.
  useEffect(() => setMonth(value.slice(0, 7)), [value]);

  useEffect(() => {
    if (!open || !routeKey) return;

    const key = `${routeKey}:${month}`;
    const cached = cache.current.get(key);
    if (cached) {
      setPrices(toPriceMap(cached));
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/flight-calendar?origin_city_id=${originCityId}&destination_city_id=${destinationCityId}&month=${month}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((body: { data?: FlightCalendarDay[] }) => {
        const days = body.data ?? [];
        cache.current.set(key, days);
        setPrices(toPriceMap(days));
      })
      .catch(() => {
        // An abort or a dead API both leave the calendar priceless, not broken.
        setPrices(new Map());
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, month, routeKey, originCityId, destinationCityId]);

  // A route change invalidates what is on screen straight away.
  useEffect(() => setPrices(new Map()), [routeKey]);

  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, anchor } = useAnchoredPanel({
    open,
    onClose: close,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  });

  const priced = [...prices.values()].filter(
    (price): price is number => price !== null,
  );
  const cheapest = priced.length > 0 ? Math.min(...priced) : null;
  // Without prices every day stays open; with them, a day nothing flies on is
  // a dead end and is not offered.
  const gating = priced.length > 0;

  return (
    <div className="flex min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tanggal berangkat
          </span>
          <span className="block truncate text-sm font-semibold">
            {shortDate(value)}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {weekdayName(value)}
          </span>
        </span>
      </button>

      {open && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label="Pilih tanggal berangkat"
        >
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            value={value}
            onSelect={(date) => {
              onChange(date);
              close();
            }}
            isDisabled={(date) => gating && (prices.get(date) ?? null) === null}
            dayLabel={(date) => {
              const price = prices.get(date) ?? null;
              return price === null
                ? longDate(date)
                : `${longDate(date)}, mulai ${shortIDR(price)}`;
            }}
            dayMeta={(date, selected) => {
              const price = prices.get(date) ?? null;
              return (
                <span
                  className={cn(
                    "mt-1 text-[10px] leading-none tabular-nums",
                    selected
                      ? "text-current"
                      : price !== null && price === cheapest
                        ? "font-semibold text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground",
                  )}
                >
                  {price === null ? "—" : shortIDR(price)}
                </span>
              );
            }}
            loading={loading}
            footnote={
              routeKey === null
                ? "Pilih rute yang dilayani untuk melihat harga per tanggal."
                : priced.length > 0
                  ? "Harga termurah per tanggal untuk rute yang dipilih. Tanggal tanpa harga tidak ada penerbangannya."
                  : loading
                    ? "Memuat harga..."
                    : "Harga per tanggal belum tersedia untuk rute ini."
            }
          />
        </AnchoredPanel>
      )}
    </div>
  );
}

function toPriceMap(days: FlightCalendarDay[]): Map<string, number | null> {
  return new Map(days.map((day) => [day.date, day.price]));
}
