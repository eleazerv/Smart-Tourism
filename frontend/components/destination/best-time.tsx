import { CalendarRange } from "lucide-react";
import { MONTHS, MONTHS_SHORT } from "@/lib/destination-data";
import { cn } from "@/lib/utils";

/**
 * Twelve-month strip marking the months whose seasonal recommendation includes
 * this destination — the "best time to visit" block a guide always carries,
 * except the months come from `climate_patterns` rather than from an editor.
 */
export function BestTime({
  months,
  seasons,
}: {
  /** 1–12. Empty when the province has no climate pattern on record. */
  months: number[];
  /** Season names covering those months, e.g. "kemarau". */
  seasons: string[];
}) {
  const currentMonth = new Date().getMonth() + 1;
  const set = new Set(months);

  return (
    <section id="waktu-terbaik" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <CalendarRange className="h-5 w-5 text-brand-700 dark:text-brand-100" />
        Waktu terbaik berkunjung
      </h2>

      {months.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada pola musim tercatat untuk daerah ini, jadi semua bulan
          diperlakukan sama.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Bulan yang disorot cocok dengan aktivitas di destinasi ini
            {seasons.length > 0 && <> selama musim {seasons.join(" dan ")}</>}.
          </p>

          <ul className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
            {MONTHS_SHORT.map((short, i) => {
              const month = i + 1;
              const good = set.has(month);
              return (
                <li key={short}>
                  <div
                    title={MONTHS[i]}
                    aria-label={`${MONTHS[i]}: ${good ? "direkomendasikan" : "kurang direkomendasikan"}`}
                    className={cn(
                      "rounded-xl border px-1 py-2.5 text-center text-xs font-semibold transition",
                      good
                        ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                        : "border-border bg-card text-muted-foreground",
                      month === currentMonth &&
                        "ring-2 ring-brand-tint ring-offset-2 ring-offset-background",
                    )}
                  >
                    {short}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-2 text-xs text-muted-foreground">
            Lingkaran menandai bulan berjalan ({MONTHS[currentMonth - 1]}).
          </p>
        </>
      )}
    </section>
  );
}
