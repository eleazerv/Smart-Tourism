"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, PlaneLanding, PlaneTakeoff, Search } from "lucide-react";
import { airport, type Airport } from "@/lib/airports";
import { AirportPicker } from "@/components/flights/airport-picker";
import { DatePicker } from "@/components/flights/date-picker";
import { withFilter, type FlightSearchState } from "@/lib/flights-search";

/**
 * Origin, destination, and date. Submits by navigating, so the board below
 * stays server-rendered and a search is shareable.
 *
 * Only airports the flights API can key on are offered — it searches by
 * `city_id`, so a code without one has no route to ask for.
 */
export function FlightSearchPanel({
  state,
  airports,
}: {
  state: FlightSearchState;
  airports: Airport[];
}) {
  const router = useRouter();

  const [from, setFrom] = useState(state.from);
  const [to, setTo] = useState(state.to);
  const [date, setDate] = useState(state.date);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  // Choosing the other end of the route as this one swaps the pair, rather
  // than leaving a flight from a city to itself on screen.
  function chooseFrom(code: string) {
    if (code === to) setTo(from);
    setFrom(code);
  }

  function chooseTo(code: string) {
    if (code === from) setFrom(to);
    setTo(code);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (from === to) return;
    router.push(withFilter(state, { from, to, date }));
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-2 shadow-pop sm:p-2.5"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_auto]">
        <AirportPicker
          value={from}
          onChange={chooseFrom}
          airports={airports}
          label="Dari"
          icon={PlaneTakeoff}
          counterpart={to}
        />

        <div className="hidden items-center justify-center lg:flex">
          <button
            type="button"
            onClick={swap}
            aria-label="Tukar asal dan tujuan"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <AirportPicker
          value={to}
          onChange={chooseTo}
          airports={airports}
          label="Ke"
          icon={PlaneLanding}
          counterpart={from}
        />

        <DatePicker
          value={date}
          onChange={setDate}
          originCityId={airport(from)?.cityId ?? null}
          destinationCityId={airport(to)?.cityId ?? null}
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          <Search className="h-4 w-4" />
          Cari
        </button>
      </div>

      {from === to && (
        <p
          role="alert"
          className="px-3 pb-1 pt-2 text-xs font-medium text-destructive"
        >
          Bandara asal dan tujuan tidak boleh sama.
        </p>
      )}
    </form>
  );
}
