"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StayDatePicker } from "@/components/stays/stay-date-picker";
import { StayPartyPicker } from "@/components/stays/stay-party-picker";
import { addDaysISO } from "@/lib/calendar";
import { stayHref, type StaySearchState } from "@/lib/stays-search";

/**
 * The dates and party size on a property page, editable in place.
 *
 * The URL is the only state: every change navigates, so the availability
 * check and the total below are recomputed on the server from the same values
 * the fields show. Keeping a local copy as well would let the two drift, and
 * a price that disagrees with the dates above it is worse than a short wait.
 *
 * Arrivals carry a departure with them, so a half-chosen range never reaches
 * the URL — `parseStaySearch` drops those, which would look like the picker
 * forgetting what was just tapped.
 */
export function StayPlanPicker({
  state,
  stayId,
}: {
  state: StaySearchState;
  stayId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (patch: Partial<StaySearchState>) => {
    startTransition(() => {
      // `scroll: false` keeps the reader on the booking column instead of
      // throwing them back to the top of the property page on every tweak.
      router.push(stayHref({ ...state, ...patch }, stayId), { scroll: false });
    });
  };

  const chooseCheckIn = (date: string) => {
    apply({
      checkIn: date,
      checkOut:
        state.checkOut !== null && state.checkOut > date
          ? state.checkOut
          : addDaysISO(date, 1),
    });
  };

  return (
    <div className="relative rounded-xl border border-border">
      <div className="grid grid-cols-2 divide-x divide-border">
        <StayDatePicker
          kind="in"
          value={state.checkIn}
          onChange={chooseCheckIn}
          counterpart={state.checkOut}
        />
        <StayDatePicker
          kind="out"
          value={state.checkOut}
          onChange={(date) => apply({ checkOut: date })}
          counterpart={state.checkIn}
        />
      </div>

      <div className="border-t border-border">
        <StayPartyPicker
          guests={state.guests}
          rooms={state.rooms}
          onChange={(next) => apply(next)}
        />
      </div>

      {pending && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 text-muted-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </span>
      )}
    </div>
  );
}
