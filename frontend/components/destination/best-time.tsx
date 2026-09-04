import { CalendarRange } from "lucide-react";
import { MONTHS, MONTHS_SHORT } from "@/lib/destination-data";
import { cn } from "@/lib/utils";

/**
 * Twelve-month strip marking the months whose seasonal recommendation includes
 * this destination — the "best time to visit" block a guide always carries,
 * except the months come from `climate_patterns` rather than from an editor.
 *
 * The strip is the detail; the sentence above it is the answer. Most readers
 * want "April sampai Oktober" and nothing more, and making them decode twelve
 * cells to reconstruct that range is work the page can do for them.
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
  const nowIsGood = set.has(currentMonth);

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
          <p className="mt-1.5 text-sm leading-relaxed">
            <span className="font-semibold">{rangeLabel(months)}</span>
            {seasons.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                &middot; musim {seasons.join(" dan ")}
              </span>
            )}
          </p>

          <ul className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
            {MONTHS_SHORT.map((short, i) => {
              const month = i + 1;
              const good = set.has(month);
              const now = month === currentMonth;

              return (
                <li key={short}>
                  <div
                    title={MONTHS[i]}
                    aria-label={`${MONTHS[i]}: ${good ? "waktu terbaik" : "kurang ideal"}${now ? ", bulan berjalan" : ""}`}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center text-xs font-semibold",
                      good
                        ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
                        : "border-border bg-card text-muted-foreground",
                      // Sits outside the border, so it reads the same over a
                      // filled month and an empty one.
                      now &&
                        "ring-2 ring-foreground/50 ring-offset-2 ring-offset-background",
                    )}
                  >
                    <span>{short}</span>
                    {/* Bentuk, bukan cuma warna: satu-satunya pembeda tadi
                        adalah isian brand, yang hilang begitu halaman dicetak
                        hitam-putih atau dibaca mata yang sulit membedakan
                        warna. */}
                    <Mark good={good} />
                  </div>
                </li>
              );
            })}
          </ul>

          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="grid h-4 w-4 place-items-center rounded-md border border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
              >
                <Mark good />
              </span>
              Waktu terbaik
            </li>
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="grid h-4 w-4 place-items-center rounded-md border border-border bg-card"
              >
                <Mark good={false} />
              </span>
              Kurang ideal
            </li>
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-md border border-border bg-card ring-2 ring-foreground/50 ring-offset-1 ring-offset-background"
              />
              Bulan berjalan ({MONTHS[currentMonth - 1]})
            </li>
          </ul>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {nowIsGood
              ? `${MONTHS[currentMonth - 1]} termasuk waktu terbaik untuk ke sini.`
              : `${MONTHS[currentMonth - 1]} di luar rentang itu — tetap bisa dikunjungi, cuaca dan keramaiannya saja yang kurang ideal.`}
          </p>
        </>
      )}
    </section>
  );
}

/** Titik penuh untuk bulan terbaik, garis untuk sisanya. */
function Mark({ good }: { good: boolean }) {
  return good ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className="h-1.5 w-1.5 fill-current"
    >
      <circle cx="4" cy="4" r="4" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className="h-1.5 w-1.5 stroke-current opacity-50"
    >
      <line x1="1" y1="4" x2="7" y2="4" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * "April–Oktober" out of a set of month numbers, joining runs that wrap past
 * December — Indonesia's wet season is November–Maret, which reads as two
 * broken stretches if the year boundary is treated as a wall.
 */
function rangeLabel(months: number[]): string {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 12) return "Sepanjang tahun";

  const runs: number[][] = [];
  for (const month of sorted) {
    const last = runs[runs.length - 1];
    if (last && month === last[last.length - 1] + 1) last.push(month);
    else runs.push([month]);
  }

  // Desember bersambung ke Januari: gabungkan run terakhir ke run pertama.
  if (
    runs.length > 1 &&
    runs[runs.length - 1].at(-1) === 12 &&
    runs[0][0] === 1
  ) {
    runs[0] = [...runs.pop()!, ...runs[0]];
  }

  const labels = runs.map((run) =>
    run.length === 1
      ? MONTHS[run[0] - 1]
      : `${MONTHS[run[0] - 1]}–${MONTHS[run[run.length - 1] - 1]}`,
  );

  // "Januari dan Maret dan Mei" -> "Januari, Maret, dan Mei".
  if (labels.length <= 2) return labels.join(" dan ");
  return `${labels.slice(0, -1).join(", ")}, dan ${labels.at(-1)}`;
}
