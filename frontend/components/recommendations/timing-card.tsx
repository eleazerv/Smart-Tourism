import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CloudRain, Sun, Users } from "lucide-react";
import { formatCount, type CrowdLevel } from "@/lib/destination-data";
import {
  formatActivities,
  isDrySeason,
  timingHref,
  type ProvinceTiming,
  type TimingState,
} from "@/lib/recommendations-data";
import { cn } from "@/lib/utils";

const TONE = {
  quiet: "bg-emerald-500/10 text-emerald-700",
  moderate: "bg-amber-500/10 text-amber-700",
  busy: "bg-rose-500/10 text-rose-700",
} as const;

const BADGE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold";

/** Musim provinsi ini: kemarau kuning matahari, hujan biru langit. */
export function SeasonBadge({ season }: { season: string }) {
  const t = useTranslations("timing");
  const dry = isDrySeason(season);
  const Icon = dry ? Sun : CloudRain;

  return (
    <span
      className={cn(
        BADGE,
        dry
          ? "bg-amber-500/10 text-amber-700"
          : "bg-sky-500/10 text-sky-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {dry ? t("seasonDry") : t("seasonWet")}
    </span>
  );
}

/** Ramai-tidaknya provinsi pada periode statistik terakhir. */
export function CrowdBadge({ crowd }: { crowd: CrowdLevel }) {
  const t = useTranslations("crowd");

  return (
    <span className={cn(BADGE, TONE[crowd.tone])}>
      <Users className="h-3 w-3" />
      {t(crowd.tone)}
    </span>
  );
}

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
  const t = useTranslations("timing");
  const locale = useLocale();

  const { info, crowd, visitors } = timing;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-2">
        {rank !== undefined && (
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold leading-tight">
            {info.province.name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <SeasonBadge season={info.season} />
            {crowd && <CrowdBadge crowd={crowd} />}
          </p>
        </div>
      </div>

      {info.recommended_activities.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("goodFor", {
            activities: formatActivities(info.recommended_activities, locale),
          })}
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{t("lastVisits")}</span>
        <span className="font-medium tabular-nums">
          {visitors === null ? t("noData") : formatCount(visitors, locale)}
        </span>
      </div>

      {/* Pointless once this province *is* the filter. */}
      {state.provinceId !== info.province.id && (
        <Link
          href={timingHref(state, { provinceId: info.province.id })}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          {t("seeProvince")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </article>
  );
}
