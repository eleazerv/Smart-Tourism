import { cn } from "@/lib/utils";

/**
 * Tripadvisor-style five-dot rating, drawn in the brand palette.
 * Half steps are rendered by clipping the filled dot.
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
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span className="font-semibold tabular-nums">
        {value.toFixed(1).replace(".", ",")}
      </span>
      <span
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Peringkat ${value} dari 5`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(Math.max(value - i, 0), 1);
          return (
            <span
              key={i}
              className="relative block h-2.5 w-2.5 rounded-full border border-brand-700/70 dark:border-brand-100/70"
            >
              <span
                className="absolute inset-0 block overflow-hidden rounded-full"
                style={{ width: `${fill * 100}%` }}
              >
                <span className="block h-full w-2.5 rounded-full bg-brand-700 dark:bg-brand-100" />
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
