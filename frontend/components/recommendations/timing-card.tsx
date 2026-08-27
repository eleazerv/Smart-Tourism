import Link from "next/link";
import { ArrowRight, CloudRain, Sun, Users } from "lucide-react";
import { formatCount } from "@/lib/destination-data";
import {
  formatActivities,
  isDrySeason,
  seasonLabel,
  timingHref,
  type ProvinceTiming,
  type TimingState,
} from "@/lib/recommendations-data";
import { cn } from "@/lib/utils";

const TONE = {
  quiet: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  busy: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
} as const;

/**
 * One province, answering both halves of the question: what the weather is
 * doing this month, and how busy the province was on the latest period on
 * record.
 */
export function TimingCard({
  timing,
  state,
  rank,
}: {
  timing: ProvinceTiming;
  state: TimingState;
  /** Position in the "quietest" ranking, when the card is part of one. */
  rank?: number;
}) {
  const { info, crowd, visitors } = timing;
  const dry = isDrySeason(info.season);
  const SeasonIcon = dry ? Sun : CloudRain;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-2">
        {rank !== undefined && (
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white dark:bg-brand-100 dark:text-brand-900">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold leading-tight">
            {info.province.name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                dry
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-sky-500/10 text-sky-700 dark:text-sky-300",
              )}
            >
              <SeasonIcon className="h-3 w-3" />
              {seasonLabel(info.season)}
            </span>
            {crowd && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  TONE[crowd.tone],
                )}
              >
                <Users className="h-3 w-3" />
                {crowd.label}
              </span>
            )}
          </p>
        </div>
      </div>

      {info.recommended_activities.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cocok untuk {formatActivities(info.recommended_activities)}.
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Kunjungan terakhir</span>
        <span className="font-medium tabular-nums">
          {visitors === null ? "Belum ada data" : formatCount(visitors)}
        </span>
      </div>

      {/* Pointless once this province *is* the filter. */}
      {state.provinceId !== info.province.id && (
        <Link
          href={timingHref(state, { provinceId: info.province.id })}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-100"
        >
          Lihat rekomendasi provinsi ini
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </article>
  );
}
