import Link from "next/link";
import { CloudRain, Sun } from "lucide-react";
import type { SeasonInfo } from "@/lib/api";
import {
  groupBySeason,
  isDrySeason,
  seasonLabel,
  timingHref,
  type TimingState,
} from "@/lib/recommendations-data";

/**
 * Every province the month has a climate pattern for, bucketed by season.
 *
 * Deliberately the whole list rather than a top-N: the reader may already have
 * a province in mind, and this is the fastest way to find out whether that one
 * is a good idea this month.
 */
export function SeasonBoard({
  info,
  state,
}: {
  info: SeasonInfo[];
  state: TimingState;
}) {
  const groups = groupBySeason(info);
  if (groups.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => {
        const dry = isDrySeason(group.season);
        const Icon = dry ? Sun : CloudRain;

        return (
          <section
            key={group.season}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon
                className={
                  dry
                    ? "h-4 w-4 text-amber-500"
                    : "h-4 w-4 text-sky-500"
                }
              />
              Musim {seasonLabel(group.season)}
              <span className="font-normal text-muted-foreground">
                · {group.entries.length} provinsi
              </span>
            </h3>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {group.entries.map((entry) => (
                <li key={entry.province.code}>
                  <Link
                    href={timingHref(state, { provinceId: entry.province.id })}
                    className="inline-block rounded-full border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
                  >
                    {entry.province.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
