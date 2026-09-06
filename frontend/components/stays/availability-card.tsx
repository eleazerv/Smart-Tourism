import Link from "next/link";
import { BedDouble, CalendarDays } from "lucide-react";
import {
  getAccommodationAvailability,
  type Accommodation,
  type AccommodationAvailability,
} from "@/lib/api";
import { nightsBetween } from "@/lib/calendar";
import { formatIDR } from "@/lib/seeded-random";
import { StayPlanPicker } from "@/components/stays/stay-plan-picker";
import {
  hasStayDates,
  stayBookingHref,
  toHref,
  type StaySearchState,
} from "@/lib/stays-search";

/**
 * The booking column: when the stay is, what those nights cost, and whether
 * there is room. The dates and party are editable here, so a reader who
 * arrived from a bare `/hotels` can fill them in without going back.
 *
 * The availability call is the only part of `/hotels` that reads the chosen
 * dates as dates rather than as a multiplier, so it is also the only part that
 * can be wrong about them — a failed check degrades to "not verified" instead
 * of claiming rooms are free.
 */
export async function AvailabilityCard({
  stay,
  state,
}: {
  stay: Accommodation;
  state: StaySearchState;
}) {
  const dated = hasStayDates(state);

  // An undated stay has no nights to check and no total to quote, so the API
  // is not called at all rather than called with invented dates.
  let availability: AccommodationAvailability | null = null;
  if (dated) {
    try {
      availability = await getAccommodationAvailability(stay.id, {
        check_in: state.checkIn,
        check_out: state.checkOut,
      });
    } catch {
      availability = null;
    }
  }

  const nights = dated ? nightsBetween(state.checkIn, state.checkOut) : null;
  const rooms = state.rooms ?? 1;
  const total = nights === null ? null : stay.price_per_night * nights * rooms;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-2xl font-bold tabular-nums">
        {formatIDR(stay.price_per_night)}
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          /malam
        </span>
      </p>

      <div className="mt-4">
        <StayPlanPicker state={state} stayId={stay.id} />
      </div>

      {dated ? (
        <>
          <div className="mt-4 flex items-start gap-2.5 text-sm">
            <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ketersediaan</p>
              <Availability available={availability?.available ?? null} wanted={rooms} />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {nights} malam
                {rooms > 1 && `, ${rooms} kamar`}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatIDR(total!)}
              </span>
            </div>

            {/* Availability is advisory: the booking call re-checks rooms and
                is the real authority, so a failed check never blocks the CTA —
                it only stops promising the rooms are there. */}
            <Link
              href={stayBookingHref(state, stay.id)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              <BedDouble className="h-4 w-4" />
              Pesan sekarang
            </Link>

            <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
              Belum ada pembayaran di langkah ini.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 flex gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-snug text-muted-foreground">
            Pilih tanggal check-in dan check-out untuk melihat ketersediaan
            kamar dan total biaya menginap.
          </p>
        </div>
      )}

      <Link
        href={toHref({ ...state, cityId: stay.cities?.id ?? null, page: 1 })}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-700 hover:bg-brand-tint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
      >
        Bandingkan penginapan lain
      </Link>
    </div>
  );
}

/**
 * How many rooms are left, said the way a booking site says it.
 *
 * The exact count is only worth printing when it is low enough to matter: "5
 * dari 5 kamar bebas" tells the reader how small the property is, which is not
 * what they asked and reads as a warning about a property that is in fact
 * wide open. Above the threshold it is simply available; at or below it, the
 * remaining count becomes the point.
 */
const SCARCE = 3;

function Availability({
  available,
  wanted,
}: {
  available: number | null;
  /** Rooms the reader is looking for. */
  wanted: number;
}) {
  if (available === null) {
    return (
      <p className="font-medium text-muted-foreground">
        Belum bisa dicek untuk tanggal ini
      </p>
    );
  }

  if (available === 0) {
    return (
      <p className="font-medium text-rose-700">Kamar penuh untuk tanggal ini</p>
    );
  }

  if (available < wanted) {
    return (
      <p className="font-medium text-rose-700">
        Tersisa {available} kamar
        <span className="text-muted-foreground">
          {" "}
          — kurang dari {wanted} yang Anda cari
        </span>
      </p>
    );
  }

  if (available <= SCARCE) {
    return (
      <p className="font-medium text-amber-700">
        Tersisa {available} kamar lagi
      </p>
    );
  }

  return <p className="font-medium text-emerald-700">Tersedia</p>;
}
