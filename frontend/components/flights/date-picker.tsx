"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { FlightCalendarDay } from "@/lib/api";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
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

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

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

  const today = todayISO();
  const cells = monthCells(month);
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
          <div className="flex items-center justify-between gap-2">
            <MonthButton
              label="Bulan sebelumnya"
              disabled={month <= today.slice(0, 7)}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </MonthButton>

            <p className="flex items-center gap-2 text-sm font-semibold">
              {monthLabel(month)}
              {loading && (
                <Loader2
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                />
              )}
            </p>

            <MonthButton
              label="Bulan berikutnya"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </MonthButton>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </span>
            ))}

            {cells.map((date, index) => {
              if (date === null) {
                return <span key={`blank-${index}`} aria-hidden="true" />;
              }

              const price = prices.get(date) ?? null;
              const past = date < today;
              const disabled = past || (gating && price === null);
              const selected = date === value;

              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(date);
                    close();
                  }}
                  aria-label={
                    price === null
                      ? longDate(date)
                      : `${longDate(date)}, mulai ${shortIDR(price)}`
                  }
                  aria-current={selected ? "date" : undefined}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-lg border text-center transition",
                    selected
                      ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                      : disabled
                        ? "cursor-not-allowed border-transparent text-muted-foreground/50"
                        : "border-transparent hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15",
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums leading-none">
                    {Number(date.slice(8, 10))}
                  </span>
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
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 border-t border-border pt-2.5 text-[11px] leading-snug text-muted-foreground">
            {routeKey === null
              ? "Pilih rute yang dilayani untuk melihat harga per tanggal."
              : priced.length > 0
                ? "Harga termurah per tanggal untuk rute yang dipilih. Tanggal tanpa harga tidak ada penerbangannya."
                : loading
                  ? "Memuat harga..."
                  : "Harga per tanggal belum tersedia untuk rute ini."}
            </p>
        </AnchoredPanel>
      )}
    </div>
  );
}

function MonthButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border transition hover:bg-brand-tint/10 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-brand-tint/15"
    >
      {children}
    </button>
  );
}

function toPriceMap(days: FlightCalendarDay[]): Map<string, number | null> {
  return new Map(days.map((day) => [day.date, day.price]));
}

/** Local today, not UTC — a date control that jumps a day is worse than none. */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/**
 * The month laid out Monday-first, with leading blanks so every date sits
 * under its weekday.
 */
function monthCells(month: string): (string | null)[] {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(year, index - 1, 1);
  // getDay() is Sunday-first; Indonesian calendars start on Monday.
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, index, 0).getDate();

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/** `3 Sep 2026` — the field's headline line. */
function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `Kamis` — the supporting line, matching the airport fields' second line. */
function weekdayName(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { weekday: "long" });
}

function longDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
