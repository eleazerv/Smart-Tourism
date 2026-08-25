"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CalendarDays, PlaneLanding, PlaneTakeoff, Search, Users } from "lucide-react";
import type { Airport, Cabin } from "@/lib/flight-data";
import { withFilter, type FlightSearchState } from "@/lib/flights-search";

/**
 * Origin, destination, date, and who is travelling. Submits by navigating, so
 * the board below stays server-rendered and a search is shareable.
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
  const [passengers, setPassengers] = useState(state.passengers);
  const [cabin, setCabin] = useState<Cabin>(state.cabin);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (from === to) return;
    router.push(withFilter(state, { from, to, date, passengers, cabin }));
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-2 shadow-pop sm:p-2.5"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto]">
        <Field label="Dari" icon={PlaneTakeoff}>
          <AirportSelect
            value={from}
            onChange={setFrom}
            airports={airports}
            label="Bandara asal"
          />
        </Field>

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

        <Field label="Ke" icon={PlaneLanding}>
          <AirportSelect
            value={to}
            onChange={setTo}
            airports={airports}
            label="Bandara tujuan"
          />
        </Field>

        <Field label="Tanggal berangkat" icon={CalendarDays}>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </Field>

        <Field label="Penumpang & kelas" icon={Users}>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <select
              aria-label="Jumlah penumpang"
              value={passengers}
              onChange={(event) => setPassengers(Number(event.target.value))}
              className="cursor-pointer bg-transparent outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>
                  {value} org
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="text-muted-foreground">
              /
            </span>
            <select
              aria-label="Kelas kabin"
              value={cabin}
              onChange={(event) => setCabin(event.target.value as Cabin)}
              className="cursor-pointer bg-transparent outline-none"
            >
              <option value="ekonomi">Ekonomi</option>
              <option value="bisnis">Bisnis</option>
            </select>
          </div>
        </Field>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 sm:col-span-2 lg:col-span-1 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          <Search className="h-4 w-4" />
          Cari
        </button>
      </div>

      {from === to && (
        <p role="alert" className="px-3 pb-1 pt-2 text-xs font-medium text-destructive">
          Bandara asal dan tujuan tidak boleh sama.
        </p>
      )}
    </form>
  );
}

function AirportSelect({
  value,
  onChange,
  airports,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  airports: Airport[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full cursor-pointer bg-transparent text-sm font-semibold outline-none"
    >
      {airports.map((entry) => (
        <option key={entry.code} value={entry.code}>
          {entry.city} ({entry.code})
        </option>
      ))}
    </select>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof PlaneTakeoff;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-brand-tint/10 focus-within:bg-brand-tint/10 dark:hover:bg-brand-tint/15">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {children}
      </span>
    </label>
  );
}
