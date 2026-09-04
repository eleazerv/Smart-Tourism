import Link from "next/link";
import { ArrowRight, CloudRain, Compass } from "lucide-react";
import { formatCount, monthRangeLabel } from "@/lib/destination-data";
import {
  formatActivities,
  monthName,
  timingHref,
  type ProvinceTiming,
  type TimingState,
} from "@/lib/recommendations-data";
import { MonthStrip } from "@/components/ui/month-strip";
import {
  CrowdBadge,
  SeasonBadge,
} from "@/components/recommendations/timing-card";

/**
 * What one province looks like in the chosen month, and in the other eleven.
 *
 * The page used to drop a province out of the ranking the moment it was in
 * the wet season, leaving a reader who had filtered to that province with a
 * single line of text and no way forward — even though the climate row, the
 * activities and the crowding were all sitting in hand, already fetched.
 *
 * One panel rather than a card beside a card: the heading above already names
 * the province and the month, so repeating either inside is noise. The month
 * strip carries the "then when?" answer and doubles as the switcher, which
 * saves a button that only ever said the same thing.
 */
export function ProvinceOutlook({
  timing,
  state,
  dryMonths,
}: {
  timing: ProvinceTiming;
  state: TimingState;
  /** Months this province is in the dry season; empty when unknown. */
  dryMonths: number[];
}) {
  const { info, crowd, visitors } = timing;
  const month = monthName(state.month);
  const dryNow = dryMonths.includes(state.month);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeasonBadge season={info.season} />
          {crowd && <CrowdBadge crowd={crowd} />}
        </div>
        <p className="text-sm text-muted-foreground">
          Kunjungan terakhir{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {visitors === null ? "belum ada data" : formatCount(visitors)}
          </span>
        </p>
      </div>

      {info.recommended_activities.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cocok untuk {formatActivities(info.recommended_activities)}.
        </p>
      )}

      {dryMonths.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-bold">Musim sepanjang tahun</h3>
            <p className="text-sm">
              <span className="text-muted-foreground">Kemarau </span>
              <span className="font-semibold">
                {monthRangeLabel(dryMonths)}
              </span>
            </p>
          </div>

          <div className="mt-3">
            <MonthStrip
              active={dryMonths}
              currentMonth={state.month}
              activeLabel="Kemarau"
              inactiveLabel="Hujan"
              hrefFor={(m) => timingHref(state, { month: m })}
            />
          </div>

          {!dryNow && (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CloudRain className="mt-px h-4 w-4 shrink-0" />
              <span>
                Bukan berarti tutup: hujan di Indonesia umumnya turun sore dan
                sebentar, dan bulan sepi begini justru paling longgar untuk
                penginapan. Bawa saja rencana cadangan dalam ruangan.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <Link
          href={timingHref(state, { provinceId: null })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-100"
        >
          <Compass className="h-4 w-4" />
          Provinsi lain yang kemarau bulan {month}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
