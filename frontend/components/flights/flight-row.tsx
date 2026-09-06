import Link from "next/link";
import { ChevronDown, Plane } from "lucide-react";
import {
  airport,
  clockOf,
  formatDuration,
  type Airport,
} from "@/lib/airports";
import { type FlightView } from "@/lib/flights-search";
import { formatIDR } from "@/lib/seeded-random";

/**
 * One itinerary. Times and the route line run across the middle, with the fare
 * and the select action in a column on the right — the layout every flight
 * search converged on, because departure time is what people scan for first.
 *
 * The detail panel is a native `<details>`, so the whole row stays
 * server-rendered and expands without any JavaScript.
 *
 * "Pilih" is a stretched link: its `::after` covers the card, so clicking
 * anywhere on the row opens the booking page. The expander has to be lifted
 * above that overlay, or opening it would navigate away instead. A sold-out
 * flight renders no link at all, so its card is deliberately inert.
 */
export function FlightRow({
  view,
  fromCode,
  toCode,
  bookHref,
}: {
  view: FlightView;
  fromCode: string;
  toCode: string;
  bookHref: string;
}) {
  const { flight } = view;
  const soldOut = flight.available_seats <= 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-tint/10 text-[11px] font-bold text-brand-900"
            >
              {carrierCode(flight.flight_number, flight.airline)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{flight.airline}</p>
              <p className="text-xs text-muted-foreground">
                {flight.flight_number}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Endpoint time={clockOf(flight.departure_time)} code={fromCode} />

            <div className="min-w-0 flex-1">
              <p className="text-center text-[11px] text-muted-foreground">
                {formatDuration(view.durationMin)}
              </p>
              <div className="relative my-1 h-px bg-border">
                <Plane
                  aria-hidden="true"
                  className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
                />
              </div>
              <p className="text-center text-[11px] font-medium text-emerald-700">
                Langsung
              </p>
            </div>

            <Endpoint
              time={clockOf(flight.arrival_time)}
              code={toCode}
              dayOffset={view.dayOffset}
            />
          </div>

          <p className="mt-2.5 text-xs text-muted-foreground">
            {soldOut ? (
              <span className="font-medium text-destructive">
                Kursi habis untuk penerbangan ini
              </span>
            ) : flight.available_seats <= 5 ? (
              <span className="font-medium text-amber-700">
                Tinggal {flight.available_seats} kursi
              </span>
            ) : (
              `${flight.available_seats} kursi tersedia`
            )}
          </p>
        </div>

        <div className="shrink-0 border-t border-border pt-3 text-right sm:w-44 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-lg font-bold tabular-nums">
            {formatIDR(flight.price)}
          </p>
          <p className="text-xs text-muted-foreground">per penumpang</p>
          {soldOut ? (
            <span className="mt-2 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">
              Habis
            </span>
          ) : (
            <Link
              href={bookHref}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition after:absolute after:inset-0 after:content-[''] hover:bg-brand-900 focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-700"
            >
              Pilih
            </Link>
          )}
        </div>
      </div>

      {/* Above the stretched overlay, so opening it toggles instead of
          following the card's link. */}
      <details className="relative z-10 border-t border-border [&_summary_svg]:transition-transform [&[open]_summary_svg]:rotate-180">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-tint/10 [&::-webkit-details-marker]:hidden">
          Detail penerbangan
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        </summary>

        <div className="grid gap-6 border-t border-border bg-muted/40 p-4 sm:grid-cols-2">
          <Itinerary view={view} from={airport(fromCode)} to={airport(toCode)} />

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Harga
            </h4>
            <dl className="mt-2.5 space-y-1.5 text-xs">
              <Row
                label="Tarif per penumpang"
                value={formatIDR(flight.price)}
              />
              <Row label="Mata uang" value={flight.currency} />
              <Row
                label="Kursi tersisa"
                value={String(flight.available_seats)}
              />
            </dl>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Satu pemesanan berlaku untuk satu penumpang. Kursi ditahan begitu
              pesanan dibuat, sebelum pembayaran.
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}

/** Departure and arrival as a vertical timeline. */
function Itinerary({
  view,
  from,
  to,
}: {
  view: FlightView;
  from: Airport | null;
  to: Airport | null;
}) {
  const { flight } = view;

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Rute
      </h4>
      <ol className="mt-2.5 space-y-3">
        <Stop
          time={clockOf(flight.departure_time)}
          code={from?.code ?? "—"}
          name={from ? `${from.name}, ${from.city}` : "Bandara asal"}
        />
        <Stop
          time={clockOf(flight.arrival_time)}
          code={to?.code ?? "—"}
          name={to ? `${to.name}, ${to.city}` : "Bandara tujuan"}
          dayOffset={view.dayOffset}
        />
      </ol>

      <dl className="mt-4 space-y-1 text-xs">
        <Detail label="Maskapai" value={flight.airline} />
        <Detail label="Nomor penerbangan" value={flight.flight_number} />
        <Detail label="Durasi" value={formatDuration(view.durationMin)} />
      </dl>
    </div>
  );
}

/** `GA 402` carries the carrier prefix; a name is the fallback. */
function carrierCode(flightNumber: string, airline: string): string {
  const prefix = flightNumber.trim().match(/^[A-Z0-9]{2}/i)?.[0];
  if (prefix) return prefix.toUpperCase();
  return airline.slice(0, 2).toUpperCase();
}

function Stop({
  time,
  code,
  name,
  dayOffset = 0,
}: {
  time: string;
  code: string;
  name: string;
  dayOffset?: number;
}) {
  return (
    <li className="flex gap-3">
      <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums">
        {time}
        {dayOffset > 0 && (
          <sup className="ml-0.5 text-[9px] text-muted-foreground">
            +{dayOffset}
          </sup>
        )}
      </span>
      <span
        aria-hidden="true"
        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-700"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{code}</span>
        <span className="block text-[11px] text-muted-foreground">{name}</span>
      </span>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Endpoint({
  time,
  code,
  dayOffset = 0,
}: {
  time: string;
  code: string;
  dayOffset?: number;
}) {
  return (
    <div className="shrink-0 text-center">
      <p className="text-lg font-bold leading-none tabular-nums">
        {time}
        {dayOffset > 0 && (
          <sup className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
            +{dayOffset}
          </sup>
        )}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{code}</p>
    </div>
  );
}
