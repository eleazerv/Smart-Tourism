"use client";

import { AISLE_AFTER, SEAT_LETTERS, cabinRows, seatNumber } from "@/lib/seat-map";
import { cn } from "@/lib/utils";

/**
 * The cabin grid. Seats already claimed by other passengers are disabled;
 * seats this booking has taken are numbered by passenger, so a group can see
 * who is sitting where without leaving the page.
 */
export function SeatPicker({
  taken,
  chosen,
  activeIndex,
  onPick,
}: {
  /** Seat numbers already claimed on this flight. */
  taken: Set<string>;
  /** One entry per passenger; `null` where no seat has been picked. */
  chosen: (string | null)[];
  /** Passenger the next tap assigns a seat to. */
  activeIndex: number;
  onPick: (seat: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto w-max px-1 pb-1">
        <div className="mb-2 flex justify-center gap-1 text-[10px] font-semibold text-muted-foreground">
          {SEAT_LETTERS.map((letter, i) => (
            <span
              key={letter}
              aria-hidden="true"
              className={cn(
                "grid h-4 w-8 place-items-center",
                i === AISLE_AFTER && "mr-6",
              )}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          {cabinRows().map((row) => (
            <div key={row} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-5 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground"
              >
                {row}
              </span>
              {SEAT_LETTERS.map((letter, i) => {
                const seat = seatNumber(row, letter);
                const isTaken = taken.has(seat);
                const mine = chosen.indexOf(seat);

                return (
                  <button
                    key={seat}
                    type="button"
                    disabled={isTaken}
                    aria-pressed={mine >= 0}
                    aria-label={
                      isTaken
                        ? `Kursi ${seat} sudah terisi`
                        : mine >= 0
                          ? `Kursi ${seat}, penumpang ${mine + 1}`
                          : `Pilih kursi ${seat}`
                    }
                    onClick={() => onPick(seat)}
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[10px] font-semibold transition",
                      i === AISLE_AFTER && "mr-6",
                      isTaken &&
                        "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50",
                      !isTaken &&
                        mine < 0 &&
                        "border-border bg-card hover:border-brand-700 hover:bg-brand-50 dark:hover:border-brand-100 dark:hover:bg-brand-700/30",
                      mine >= 0 &&
                        "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900",
                    )}
                  >
                    {mine >= 0 ? mine + 1 : isTaken ? "×" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Memilih kursi untuk penumpang {activeIndex + 1}.
      </p>
    </div>
  );
}
