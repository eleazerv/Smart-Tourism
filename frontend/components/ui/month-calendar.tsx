"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  WEEKDAYS,
  longDate,
  monthCells,
  monthLabel,
  shiftMonth,
  todayISO,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

/**
 * One month as a Monday-first grid, with the month stepper above it.
 *
 * Shared by the flight and stay date fields so both read as the same control.
 * The flight version prints the cheapest fare under each day through
 * `dayMeta`; the stay version has no per-day data and leaves it out, which
 * also shrinks the cells.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  value,
  onSelect,
  /** Earliest selectable day, inclusive. Defaults to today. */
  minDate,
  /** Extra rule on top of `minDate` — a day with no flights, say. */
  isDisabled,
  /** Second line inside a day cell. */
  dayMeta,
  /** Accessible name for a day, when `dayMeta` adds meaning to it. */
  dayLabel,
  /** Marks the range between two dates, for check-in/check-out pairs. */
  inRange,
  loading = false,
  footnote,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  value: string;
  onSelect: (date: string) => void;
  minDate?: string;
  isDisabled?: (date: string) => boolean;
  dayMeta?: (date: string, selected: boolean) => React.ReactNode;
  dayLabel?: (date: string) => string;
  inRange?: (date: string) => boolean;
  loading?: boolean;
  footnote?: React.ReactNode;
}) {
  const floor = minDate ?? todayISO();
  const cells = monthCells(month);
  const compact = dayMeta === undefined;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <MonthButton
          label="Bulan sebelumnya"
          disabled={month <= floor.slice(0, 7)}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
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
          onClick={() => onMonthChange(shiftMonth(month, 1))}
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

          const disabled = date < floor || (isDisabled?.(date) ?? false);
          const selected = date === value;
          const ranged = !selected && (inRange?.(date) ?? false);

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-label={dayLabel?.(date) ?? longDate(date)}
              aria-current={selected ? "date" : undefined}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border text-center transition",
                compact ? "h-9" : "h-12",
                selected
                  ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                  : disabled
                    ? "cursor-not-allowed border-transparent text-muted-foreground/50"
                    : ranged
                      ? "border-transparent bg-brand-tint/15 dark:bg-brand-tint/20"
                      : "border-transparent hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15",
              )}
            >
              <span className="text-sm font-semibold tabular-nums leading-none">
                {Number(date.slice(8, 10))}
              </span>
              {dayMeta?.(date, selected)}
            </button>
          );
        })}
      </div>

      {footnote && (
        <p className="mt-2.5 border-t border-border pt-2.5 text-[11px] leading-snug text-muted-foreground">
          {footnote}
        </p>
      )}
    </>
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
