import Link from "next/link";
import { RotateCcw, Star } from "lucide-react";
import type { Tag } from "@/lib/api";
import {
  RATING_STEPS,
  formatRating,
  hasFilters,
  withFilter,
  withTagToggled,
  type ProvinceFacet,
  type SearchState,
} from "@/lib/destinations-search";
import { CheckRow } from "@/components/catalogue/check-row";
import { FilterGroup } from "@/components/catalogue/filter-group";

/** The facet column for the destination catalogue. */
export function FilterGroups({
  state,
  tags,
  provinces,
}: {
  state: SearchState;
  tags: Tag[];
  provinces: ProvinceFacet[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight">
          Saring hasil
        </h2>
        {hasFilters(state) && (
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            Atur ulang
          </Link>
        )}
      </div>

      <FilterGroup title="Jenis destinasi">
        {tags.map((tag) => (
          <CheckRow
            key={tag.id}
            href={withTagToggled(state, tag.slug)}
            label={tag.name}
            checked={state.tags.includes(tag.slug)}
          />
        ))}
      </FilterGroup>

      {provinces.length > 1 && (
        <FilterGroup title="Provinsi">
          {provinces.map((province) => (
            <CheckRow
              key={province.id}
              shape="radio"
              href={withFilter(state, {
                provinceId:
                  state.provinceId === province.id ? null : province.id,
              })}
              label={province.name}
              hint={String(province.count)}
              checked={state.provinceId === province.id}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Rating pengunjung">
        {RATING_STEPS.map((step) => (
          <CheckRow
            key={step}
            shape="radio"
            href={withFilter(state, {
              minRating: state.minRating === step ? 0 : step,
            })}
            label={
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {formatRating(step)} ke atas
              </span>
            }
            checked={state.minRating === step}
          />
        ))}
      </FilterGroup>

      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
        Rating dihitung dari ulasan pengunjung yang sudah masuk. Destinasi baru
        yang belum punya ulasan tidak muncul saat filter rating aktif.
      </p>
    </div>
  );
}
