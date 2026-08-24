import Link from "next/link";
import { Briefcase, ChevronDown, Plane } from "lucide-react";
import {
  airport,
  arrivalDayOffset,
  arrivalMinutes,
  fareBreakdown,
  formatClock,
  formatDuration,
  type Cabin,
  type Flight,
} from "@/lib/flight-data";
import { formatIDR } from "@/lib/seeded-random";

/**
 * One itinerary. Times and the route line run across the middle, with the fare
 * and the select action in a column on the right — the layout every flight
 * search converged on, because departure time is what people scan for first.
 *
 * The detail panel is a native `<details>`, so the whole row stays
 * server-rendered and expands without any JavaScript.
 */
export function FlightRow({
  flight,
  passengers,
  cabin,
  bookHref,
}: {
  flight: Flight;
  passengers: number;
  cabin: Cabin;
  bookHref: string;
}) {
  const fare = fareBreakdown(flight.price, passengers);
  const dayOffset = arrivalDayOffset(flight);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700/40 dark:hover:border-brand-100/30">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-900 dark:bg-brand-700/50 dark:text-brand-50"
            >
              {flight.airlineCode}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {flight.airlineName}
              </p>
              <p className="text-xs text-muted-foreground">
                {flight.flightNo} &middot; {flight.aircraft}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Endpoint
              time={formatClock(flight.departMinutes)}
              code={flight.from}
            />

            <div className="min-w-0 flex-1">
              <p className="text-center text-[11px] text-muted-foreground">
                {formatDuration(flight.durationMin)}
              </p>
              <div className="relative my-1 h-px bg-border">
                <Plane
                  aria-hidden="true"
                  className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
                />
                {flight.stops === 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-500"
                  />
                )}
              </div>
              <p className="text-center text-[11px] font-medium">
                {flight.stops === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Langsung
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">
                    1 transit &middot; {flight.via}
                  </span>
                )}
              </p>
            </div>

            <Endpoint
              time={formatClock(arrivalMinutes(flight))}
              code={flight.to}
              dayOffset={dayOffset}
            />
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            {flight.baggageKg > 0
              ? `Bagasi ${flight.baggageKg} kg termasuk`
              : "Hanya bagasi kabin"}
          </p>
        </div>

        <div className="shrink-0 border-t border-border pt-3 text-right sm:w-44 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-lg font-bold tabular-nums">
            {formatIDR(flight.price)}
          </p>
          <p className="text-xs text-muted-foreground">
            {passengers > 1
              ? `${formatIDR(fare.total)} / ${passengers} org`
              : "per orang"}
          </p>
          <Link
            href={bookHref}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            Pilih
          </Link>
        </div>
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-tint/10 dark:text-brand-100 dark:hover:bg-brand-tint/15 [&::-webkit-details-marker]:hidden">
          Detail penerbangan
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="grid gap-6 border-t border-border bg-muted/40 p-4 sm:grid-cols-2">
          <Itinerary flight={flight} cabin={cabin} />
          <FareTable flight={flight} passengers={passengers} />
        </div>
      </details>
    </article>
  );
}

/** Departure, connection and arrival as a vertical timeline. */
function Itinerary({ flight, cabin }: { flight: Flight; cabin: Cabin }) {
  const from = airport(flight.from);
  const to = airport(flight.to);
  const via = flight.via ? airport(flight.via) : null;

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Rute
      </h4>
      <ol className="mt-2.5 space-y-3">
        <Stop
          time={formatClock(flight.departMinutes)}
          code={flight.from}
          name={from ? `${from.name}, ${from.city}` : flight.from}
        />
        {via && (
          <Stop
            time={null}
            code={via.code}
            name={`Transit di ${via.name}, ${via.city}`}
            muted
          />
        )}
        <Stop
          time={formatClock(arrivalMinutes(flight))}
          code={flight.to}
          name={to ? `${to.name}, ${to.city}` : flight.to}
          dayOffset={arrivalDayOffset(flight)}
        />
      </ol>

      <dl className="mt-4 space-y-1 text-xs">
        <Detail label="Pesawat" value={flight.aircraft} />
        <Detail label="Kelas" value={cabin === "bisnis" ? "Bisnis" : "Ekonomi"} />
        <Detail
          label="Bagasi"
          value={
            flight.baggageKg > 0
              ? `${flight.baggageKg} kg + 7 kg kabin`
              : "7 kg kabin saja"
          }
        />
        <Detail label="Durasi" value={formatDuration(flight.durationMin)} />
      </dl>
    </div>
  );
}

function FareTable({
  flight,
  passengers,
}: {
  flight: Flight;
  passengers: number;
}) {
  const fare = fareBreakdown(flight.price, passengers);

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Rincian harga
      </h4>
      <dl className="mt-2.5 space-y-1.5 text-xs">
        <Row
          label={`Tarif penumpang (${passengers}x)`}
          value={formatIDR(fare.base)}
        />
        <Row label="Pajak & biaya layanan" value={formatIDR(fare.tax)} />
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatIDR(fare.total)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Harga sudah termasuk pajak. Tidak ada biaya tambahan di langkah
        berikutnya.
      </p>
    </div>
  );
}

function Stop({
  time,
  code,
  name,
  dayOffset = 0,
  muted = false,
}: {
  time: string | null;
  code: string;
  name: string;
  dayOffset?: number;
  muted?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums">
        {time ?? ""}
        {dayOffset > 0 && (
          <sup className="ml-0.5 text-[9px] text-muted-foreground">
            +{dayOffset}
          </sup>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${muted ? "bg-amber-500" : "bg-brand-700 dark:bg-brand-100"}`}
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
