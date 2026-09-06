import Link from "next/link";
import { BedDouble, CalendarDays, Users } from "lucide-react";
import {
  getAccommodationAvailability,
  type Accommodation,
  type AccommodationAvailability,
} from "@/lib/api";
import { formatIDR } from "@/lib/seeded-random";
import {
  formatDateLabel,
  nightCount,
  toHref,
  type StaySearchState,
} from "@/lib/stays-search";

/**
 * The booking column: the dates carried over from the search, what those
 * nights cost, and how many rooms are actually free across them.
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
  const nights = nightCount(state);
  const total = stay.price_per_night * nights * state.rooms;

  let availability: AccommodationAvailability | null = null;
  try {
    availability = await getAccommodationAvailability(stay.id, {
      check_in: state.checkIn,
      check_out: state.checkOut,
    });
  } catch {
    availability = null;
  }

  const enough =
    availability !== null && availability.available >= state.rooms;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-2xl font-bold tabular-nums">
        {formatIDR(stay.price_per_night)}
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          /malam
        </span>
      </p>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Tanggal menginap</dt>
            <dd className="font-medium">
              {formatDateLabel(state.checkIn)} –{" "}
              {formatDateLabel(state.checkOut)}{" "}
              <span className="text-muted-foreground">({nights} malam)</span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Rombongan</dt>
            <dd className="font-medium">
              {state.guests} tamu, {state.rooms} kamar
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Ketersediaan kamar</dt>
            <dd className="font-medium">
              {availability === null ? (
                <span className="text-muted-foreground">
                  Belum bisa dicek untuk tanggal ini
                </span>
              ) : (
                <span
                  className={
                    enough
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }
                >
                  {availability.available} dari {availability.room_count} kamar
                  bebas
                  {!enough && state.rooms > 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      — kurang dari {state.rooms} yang Anda cari
                    </span>
                  )}
                </span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {nights} malam
            {state.rooms > 1 && `, ${state.rooms} kamar`}
          </span>
          <span className="text-lg font-bold tabular-nums">
            {formatIDR(total)}
          </span>
        </div>

        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
          Pemesanan penginapan lewat Jelantara belum dibuka. Angka di atas
          adalah perkiraan biaya untuk tanggal yang Anda pilih.
        </p>

        <Link
          href={toHref({ ...state, cityId: stay.cities?.id ?? null, page: 1 })}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-700 hover:bg-brand-tint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:text-brand-100 dark:hover:border-brand-100 dark:hover:bg-brand-700/30"
        >
          Bandingkan penginapan lain
        </Link>
      </div>
    </div>
  );
}
