import type { Review } from "@/lib/api";
import { Rating } from "@/components/home/rating";
import { formatCount, ratingLabel } from "@/lib/destination-data";

/**
 * Average plus the 5→1 histogram, computed from the reviews the API returned.
 * `avg_rating` on the destination row is the authoritative average — the list
 * is capped at 50 — so the bars describe the shown sample, not the whole set.
 */
export function ReviewSummary({
  reviews,
  average,
}: {
  reviews: Review[];
  average: number | null;
}) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));
  const max = Math.max(1, ...counts.map((row) => row.count));
  const shown = average ?? (reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null);

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
      <div className="sm:w-40">
        <p className="font-display text-4xl font-bold tracking-tight">
          {shown !== null ? shown.toFixed(1).replace(".", ",") : "—"}
        </p>
        {shown !== null && (
          <>
            <Rating value={shown} className="mt-1" />
            <p className="mt-1 text-sm font-medium">{ratingLabel(shown)}</p>
          </>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatCount(reviews.length)} ulasan
        </p>
      </div>

      <ul className="space-y-1.5 self-center">
        {counts.map(({ star, count }) => (
          <li key={star} className="flex items-center gap-3 text-xs">
            <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
              {star}★
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-brand-700 dark:bg-brand-100"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
              {count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
