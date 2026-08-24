import Link from "next/link";
import { Briefcase, Plane } from "lucide-react";
import {
  arrivalDayOffset,
  arrivalMinutes,
  formatClock,
  formatDuration,
  type Flight,
} from "@/lib/flight-data";
import { formatIDR } from "@/lib/seeded-random";

/**
 * One itinerary. Times and the route line run across the middle, with the fare
 * and the call to action in a column on the right — the layout every flight
 * search converged on, because departure time is what people scan for first.
 */
export function FlightRow({
  flight,
  passengers,
  /** Where the reader goes next; there is no checkout behind this. */
  exploreHref,
  exploreLabel,
}: {
  flight: Flight;
  passengers: number;
  exploreHref: string;
  exploreLabel: string;
}) {
  const total = flight.price * passengers;
  const dayOffset = arrivalDayOffset(flight);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-brand-700/40 hover:shadow-pop dark:hover:border-brand-100/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
              ? `${formatIDR(total)} untuk ${passengers} orang`
              : "per orang"}
          </p>
          <Link
            href={exploreHref}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            {exploreLabel}
          </Link>
        </div>
      </div>
    </article>
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
