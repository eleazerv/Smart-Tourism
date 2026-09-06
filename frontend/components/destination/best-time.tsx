import { CalendarRange } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { monthRangeLabel } from "@/lib/destination-data";
import { joinList, monthName } from "@/lib/intl";
import { MonthStrip } from "@/components/ui/month-strip";

/**
 * Twelve-month strip marking the months whose seasonal recommendation includes
 * this destination — the "best time to visit" block a guide always carries,
 * except the months come from `climate_patterns` rather than from an editor.
 *
 * The strip is the detail; the sentence above it is the answer. Most readers
 * want "April sampai Oktober" and nothing more, and making them decode twelve
 * cells to reconstruct that range is work the page can do for them.
 */
export async function BestTime({
  months,
  seasons,
}: {
  /** 1–12. Empty when the province has no climate pattern on record. */
  months: number[];
  /** Season names covering those months, e.g. "kemarau". */
  seasons: string[];
}) {
  const t = await getTranslations("destination");
  const locale = await getLocale();

  const currentMonth = new Date().getMonth() + 1;
  const nowIsGood = months.includes(currentMonth);
  const range = monthRangeLabel(months, locale);
  const current = monthName(currentMonth, locale);

  return (
    <section id="waktu-terbaik" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <CalendarRange className="h-5 w-5 text-brand-700" />
        {t("bestTimeHeading")}
      </h2>

      {months.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t("bestTimeNone")}
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm leading-relaxed">
            {/* `monthRangeLabel` mengembalikan null untuk dua belas bulan
                sekaligus, karena kata "sepanjang tahun" tidak bisa disusun
                dari nama bulan. */}
            <span className="font-semibold">{range ?? t("allYear")}</span>
            {seasons.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                &middot;{" "}
                {t("seasonSuffix", { seasons: joinList(seasons, locale) })}
              </span>
            )}
          </p>

          <div className="mt-3">
            <MonthStrip
              active={months}
              currentMonth={currentMonth}
              activeLabel={t("monthBest")}
              inactiveLabel={t("monthLessIdeal")}
              locale={locale}
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {nowIsGood
              ? t("nowGood", { month: current })
              : t("nowBad", { month: current })}
          </p>
        </>
      )}
    </section>
  );
}
