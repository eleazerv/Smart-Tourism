"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import {
  withFilter,
  type CityFacet,
  type StaySearchState,
} from "@/lib/stays-search";

/**
 * The booking-form header: where, when, and how many. Submits by navigating,
 * so the results below stay server-rendered and the search is shareable.
 */
export function StaySearchPanel({
  state,
  cities,
}: {
  state: StaySearchState;
  cities: CityFacet[];
}) {
  const router = useRouter();

  const [cityId, setCityId] = useState(state.cityId ?? 0);
  const [checkIn, setCheckIn] = useState(state.checkIn);
  const [checkOut, setCheckOut] = useState(state.checkOut);
  const [guests, setGuests] = useState(state.guests);
  const [rooms, setRooms] = useState(state.rooms);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      withFilter(state, {
        cityId: cityId > 0 ? cityId : null,
        checkIn,
        // A checkout that is not after the checkin is meaningless; nudge it
        // rather than refusing the search.
        checkOut: checkOut > checkIn ? checkOut : nextDay(checkIn),
        guests,
        rooms,
      }),
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-2 shadow-pop sm:p-2.5"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <Field label="Kota atau area" icon={MapPin}>
          <select
            value={cityId}
            onChange={(event) => setCityId(Number(event.target.value))}
            className="w-full cursor-pointer bg-transparent text-sm font-semibold outline-none"
          >
            <option value={0}>Semua kota</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
                {city.province ? ` · ${city.province}` : ""} ({city.count})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Check-in" icon={CalendarDays}>
          <input
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </Field>

        <Field label="Check-out" icon={CalendarDays}>
          <input
            type="date"
            value={checkOut}
            min={nextDay(checkIn)}
            onChange={(event) => setCheckOut(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
        </Field>

        <Field label="Tamu & kamar" icon={Users}>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <select
              aria-label="Jumlah tamu"
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className="cursor-pointer bg-transparent outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((value) => (
                <option key={value} value={value}>
                  {value} tamu
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="text-muted-foreground">
              /
            </span>
            <select
              aria-label="Jumlah kamar"
              value={rooms}
              onChange={(event) => setRooms(Number(event.target.value))}
              className="cursor-pointer bg-transparent outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value} kamar
                </option>
              ))}
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
    </form>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof MapPin;
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

function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
