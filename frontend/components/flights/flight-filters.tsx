import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { AIRLINES } from "@/lib/flight-data";
import {
  TIME_WINDOWS,
  activeFilterCount,
  withAirlineToggled,
  withFilter,
  withWindowToggled,
  type FlightSearchState,
  type TimeWindowKey,
} from "@/lib/flights-search";
import { CheckRow } from "@/components/catalogue/check-row";
import { FilterGroup } from "@/components/catalogue/filter-group";

/** Facet column for the flight board. */
export function FlightFilters({
  state,
  resetHref,
  airlineCounts,
  windowCounts,
  stopCounts,
}: {
  state: FlightSearchState;
  resetHref: string;
  airlineCounts: Map<string, number>;
  windowCounts: Map<TimeWindowKey, number>;
  stopCounts: Map<number, number>;
}) {
  const direct = stopCounts.get(0) ?? 0;
  const oneStop = stopCounts.get(1) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          Saring penerbangan
        </h2>
        {activeFilterCount(state) > 0 && (
          <Link
            href={resetHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-100"
          >
            <RotateCcw className="h-3 w-3" />
            Atur ulang
          </Link>
        )}
      </div>

      <FilterGroup title="Transit">
        <CheckRow
          shape="radio"
          href={withFilter(state, { maxStops: state.maxStops === 0 ? null : 0 })}
          label="Langsung"
          hint={String(direct)}
          checked={state.maxStops === 0}
        />
        <CheckRow
          shape="radio"
          href={withFilter(state, { maxStops: state.maxStops === 1 ? null : 1 })}
          label="Maksimal 1 transit"
          hint={String(direct + oneStop)}
          checked={state.maxStops === 1}
        />
      </FilterGroup>

      <FilterGroup title="Waktu berangkat">
        {TIME_WINDOWS.map((window) => (
          <CheckRow
            key={window.key}
            href={withWindowToggled(state, window.key)}
            label={
              <span>
                {window.label}{" "}
                <span className="text-xs text-muted-foreground">
                  {window.hint}
                </span>
              </span>
            }
            hint={String(windowCounts.get(window.key) ?? 0)}
            checked={state.windows.includes(window.key)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Maskapai">
        {AIRLINES.filter(
          (airline) => (airlineCounts.get(airline.code) ?? 0) > 0,
        ).map((airline) => (
          <CheckRow
            key={airline.code}
            href={withAirlineToggled(state, airline.code)}
            label={airline.name}
            hint={String(airlineCounts.get(airline.code) ?? 0)}
            checked={state.airlines.includes(airline.code)}
          />
        ))}
      </FilterGroup>
    </div>
  );
}
