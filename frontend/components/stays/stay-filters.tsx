import Link from "next/link";
import { RotateCcw, Star } from "lucide-react";
import { STAY_TYPES, FACILITIES, type StayType } from "@/lib/stay-data";
import {
  PRICE_CAPS,
  SCORE_STEPS,
  activeFilterCount,
  formatScore,
  withFacilityToggled,
  withFilter,
  withStarToggled,
  withTypeToggled,
  type StaySearchState,
} from "@/lib/stays-search";
import { formatIDR } from "@/lib/seeded-random";
import { CheckRow } from "@/components/catalogue/check-row";
import { FilterGroup } from "@/components/catalogue/filter-group";

/** Facet column for the accommodation search. */
export function StayFilters({
  state,
  resetHref,
  typeCounts,
  starCounts,
  facilityCounts,
}: {
  state: StaySearchState;
  /** Clears the facets but keeps the city and dates the reader searched for. */
  resetHref: string;
  typeCounts: Map<StayType, number>;
  starCounts: Map<number, number>;
  facilityCounts: Map<string, number>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          Saring hasil
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

      <FilterGroup title="Harga per malam">
        {PRICE_CAPS.map((cap) => (
          <CheckRow
            key={cap}
            shape="radio"
            href={withFilter(state, {
              maxPrice: state.maxPrice === cap ? null : cap,
            })}
            label={`Sampai ${formatIDR(cap)}`}
            checked={state.maxPrice === cap}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Tipe properti">
        {STAY_TYPES.filter((type) => (typeCounts.get(type.value) ?? 0) > 0).map(
          (type) => (
            <CheckRow
              key={type.value}
              href={withTypeToggled(state, type.value)}
              label={type.label}
              hint={String(typeCounts.get(type.value) ?? 0)}
              checked={state.types.includes(type.value)}
            />
          ),
        )}
      </FilterGroup>

      <FilterGroup title="Kelas bintang">
        {[5, 4, 3, 2, 1]
          .filter((star) => (starCounts.get(star) ?? 0) > 0)
          .map((star) => (
            <CheckRow
              key={star}
              href={withStarToggled(state, star)}
              label={
                <span className="inline-flex items-center gap-1">
                  {Array.from({ length: star }, (_, i) => (
                    <Star
                      key={i}
                      className="h-3 w-3 fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="ml-1">
                    {star} bintang
                  </span>
                </span>
              }
              hint={String(starCounts.get(star) ?? 0)}
              checked={state.stars.includes(star)}
            />
          ))}
      </FilterGroup>

      <FilterGroup title="Rating tamu">
        {SCORE_STEPS.map((step) => (
          <CheckRow
            key={step}
            shape="radio"
            href={withFilter(state, {
              minScore: state.minScore === step ? 0 : step,
            })}
            label={`${formatScore(step)} ke atas`}
            checked={state.minScore === step}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Fasilitas">
        {FACILITIES.filter(
          (facility) => (facilityCounts.get(facility) ?? 0) > 0,
        ).map((facility) => (
          <CheckRow
            key={facility}
            href={withFacilityToggled(state, facility)}
            label={facility}
            hint={String(facilityCounts.get(facility) ?? 0)}
            checked={state.facilities.includes(facility)}
          />
        ))}
      </FilterGroup>
    </div>
  );
}
