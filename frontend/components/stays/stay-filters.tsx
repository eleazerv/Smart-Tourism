import { Link } from "@/i18n/navigation";
import { RotateCcw } from "lucide-react";
import type { AccommodationTier } from "@/lib/api";
import {
  PRICE_CAPS,
  TIERS,
  activeFilterCount,
  withFilter,
  withTierToggled,
  type StaySearchState,
} from "@/lib/stays-search";
import { formatIDR } from "@/lib/seeded-random";
import { CheckRow } from "@/components/catalogue/check-row";
import { FilterGroup } from "@/components/catalogue/filter-group";
import { useTranslations } from "next-intl";

/** Facet column for the accommodation search. */
export function StayFilters({
  state,
  resetHref,
  tierCounts,
}: {
  state: StaySearchState;
  /** Clears the facets but keeps the city and dates the reader searched for. */
  resetHref: string;
  tierCounts: Map<AccommodationTier, number>;
}) {
  const t = useTranslations("stays");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          Saring hasil
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

      <FilterGroup title={t("priceGroup")}>
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

      <FilterGroup title={t("tierGroup")}>
        {TIERS.filter((tier) => (tierCounts.get(tier.value) ?? 0) > 0).map(
          (tier) => (
            <CheckRow
              key={tier.value}
              href={withTierToggled(state, tier.value)}
              label={t(`tier.${tier.value}`)}
              hint={String(tierCounts.get(tier.value) ?? 0)}
              checked={state.tiers.includes(tier.value)}
            />
          ),
        )}
      </FilterGroup>

      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
        {t("filterNote")}
      </p>
    </div>
  );
}
