"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import { MonthCalendar } from "@/components/ui/month-calendar";
import {
  addDaysISO,
  nightsBetween,
  shortDate,
  todayISO,
  weekdayName,
} from "@/lib/calendar";

/**
 * Check-in and check-out as month calendars, the same control the flight
 * search uses — the whole field is the trigger, so it opens on a tap anywhere
 * in it rather than only on a native date input.
 *
 * There is no per-day price to print here: `/api/accommodations` has one rate
 * per property, not a rate per night, so the cells stay bare and compact.
 */

/** Enough for six week rows plus the header and footnote. */
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 360;

export function StayDatePicker({
  kind,
  value,
  onChange,
  /** The other end of the stay, for the range shading and the floor. */
  counterpart,
}: {
  kind: "in" | "out";
  /** `YYYY-MM-DD`. */
  value: string;
  onChange: (date: string) => void;
  counterpart: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => value.slice(0, 7));

  // The chosen date moving to another month (a new search, say) follows.
  useEffect(() => setMonth(value.slice(0, 7)), [value]);

  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, anchor } = useAnchoredPanel({
    open,
    onClose: close,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  });

  // Check-out cannot land on or before check-in, so its floor is the night
  // after the arrival rather than today.
  const floor = kind === "out" ? addDaysISO(counterpart, 1) : todayISO();
  const [from, to] = kind === "in" ? [value, counterpart] : [counterpart, value];
  const nights = nightsBetween(from, to);

  return (
    <div className="flex min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-brand-tint/10"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {kind === "in" ? "Check-in" : "Check-out"}
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
          label={kind === "in" ? "Pilih tanggal check-in" : "Pilih tanggal check-out"}
        >
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            value={value}
            onSelect={(date) => {
              onChange(date);
              close();
            }}
            minDate={floor}
            inRange={(date) => date > from && date < to}
            footnote={
              kind === "in"
                ? `Menginap ${nights} malam, sampai ${shortDate(to)}.`
                : `Menginap ${nights} malam, sejak ${shortDate(from)}.`
            }
          />
        </AnchoredPanel>
      )}
    </div>
  );
}
