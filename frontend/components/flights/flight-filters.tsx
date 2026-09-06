import { Link } from "@/i18n/navigation";
import { RotateCcw } from "lucide-react";
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
import { useTranslations } from "next-intl";

/**
 * Facet column for the flight board. The airline list is built from the day
 * that came back, not from a fixed roster — whoever flies the route is whoever
 * the API returned.
 */
export function FlightFilters({
  state,
  resetHref,
  airlineCounts,
  windowCounts,
  availableCount,
}: {
  state: FlightSearchState;
  resetHref: string;
  airlineCounts: Map<string, number>;
  windowCounts: Map<TimeWindowKey, number>;
  availableCount: number;
}) {
  const t = useTranslations("flights");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          {t("filterHeading")}
        </h2>
        {activeFilterCount(state) > 0 && (
          <Link
            href={resetHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Atur ulang
          </Link>
        )}
      </div>

      <FilterGroup title="Ketersediaan">
        <CheckRow
          href={withFilter(state, { availableOnly: !state.availableOnly })}
          label={t("seatsAvailable")}
          hint={String(availableCount)}
          checked={state.availableOnly}
        />
      </FilterGroup>

      <FilterGroup title="Waktu berangkat">
        {TIME_WINDOWS.map((window) => (
          <CheckRow
            key={window.key}
            href={withWindowToggled(state, window.key)}
            label={
              <span>
                {t(`block.${window.key}`)}{" "}
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

      {airlineCounts.size > 0 && (
        <FilterGroup title={t("airlineGroup")}>
          {[...airlineCounts].map(([airline, count]) => (
            <CheckRow
              key={airline}
              href={withAirlineToggled(state, airline)}
              label={airline}
              hint={String(count)}
              checked={state.airlines.includes(airline)}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  );
}
