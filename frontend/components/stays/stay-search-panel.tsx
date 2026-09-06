"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { StayCityPicker } from "@/components/stays/stay-city-picker";
import { StayDatePicker } from "@/components/stays/stay-date-picker";
import { StayPartyPicker } from "@/components/stays/stay-party-picker";
import { addDaysISO } from "@/lib/calendar";
import {
  withFilter,
  type CityFacet,
  type StaySearchState,
} from "@/lib/stays-search";

/**
 * The booking-form header: where, when, and how many. Submits by navigating,
 * so the results below stay server-rendered and the search is shareable.
 *
 * Every field is a button that opens its own panel, the same pattern the
 * flight search uses — a tap anywhere on a field opens it, rather than only a
 * tap that lands on a native control inside it.
 */
export function StaySearchPanel({
  state,
  cities,
}: {
  state: StaySearchState;
  cities: CityFacet[];
}) {
  const router = useRouter();

  const [cityId, setCityId] = useState(state.cityId);
  const [checkIn, setCheckIn] = useState(state.checkIn);
  const [checkOut, setCheckOut] = useState(state.checkOut);
  const [guests, setGuests] = useState(state.guests);
  const [rooms, setRooms] = useState(state.rooms);

  /** Moving the arrival past the departure drags the departure with it. */
  const chooseCheckIn = (date: string) => {
    setCheckIn(date);
    if (date >= checkOut) setCheckOut(addDaysISO(date, 1));
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      withFilter(state, {
        cityId,
        checkIn,
        // A checkout that is not after the checkin is meaningless; nudge it
        // rather than refusing the search.
        checkOut: checkOut > checkIn ? checkOut : addDaysISO(checkIn, 1),
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
        <StayCityPicker value={cityId} onChange={setCityId} cities={cities} />

        <StayDatePicker
          kind="in"
          value={checkIn}
          onChange={chooseCheckIn}
          counterpart={checkOut}
        />

        <StayDatePicker
          kind="out"
          value={checkOut}
          onChange={setCheckOut}
          counterpart={checkIn}
        />

        <StayPartyPicker
          guests={guests}
          rooms={rooms}
          onChange={(next) => {
            setGuests(next.guests);
            setRooms(next.rooms);
          }}
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 sm:col-span-2 lg:col-span-1"
        >
          <Search className="h-4 w-4" />
          Cari
        </button>
      </div>
    </form>
  );
}
