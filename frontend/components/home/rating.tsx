import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Five-star rating in the conventional rating gold, deliberately outside the
 * brand palette — the same exception every review UI makes.
 *
 * Each position stacks a filled star over an outline one and clips the filled
 * layer to the fractional part, so half steps land on the exact percentage
 * rather than snapping to a half-star glyph.
 */
export function Rating({
  value,
  reviews,
  className,
}: {
  value: number;
  reviews?: number;
  className?: string;
}) {
  const t = useTranslations("destination");
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span className="font-semibold tabular-nums">
        {value.toFixed(1).replace(".", ",")}
      </span>
      <span
        className="flex items-center gap-0.5"
        role="img"
        aria-label={t("ratingAria", { value })}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          // Rounded so float noise like 70.00000000000001% stays out of the DOM.
          const fill = Math.round(Math.min(Math.max(value - i, 0), 1) * 1000) / 10;
          return (
            <span
              key={i}
              className="relative inline-block h-3.5 w-3.5 shrink-0"
            >
              <Star
                aria-hidden="true"
                className="absolute left-0 top-0 h-3.5 w-3.5 text-amber-400/35"
              />
              <span
                className="absolute left-0 top-0 h-full overflow-hidden"
                style={{ width: `${fill}%` }}
              >
                <Star
                  aria-hidden="true"
                  className="h-3.5 w-3.5 max-w-none fill-amber-400 text-amber-400"
                />
              </span>
            </span>
          );
        })}
      </span>
      {reviews !== undefined && (
        <span className="text-muted-foreground tabular-nums">
          ({reviews.toLocaleString("id-ID")})
        </span>
      )}
    </div>
  );
}
