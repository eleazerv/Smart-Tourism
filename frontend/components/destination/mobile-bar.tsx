import { Star } from "lucide-react";
import { formatCount } from "@/lib/destination-data";

/**
 * Sticky action bar on phones, where the plan card has dropped below the fold.
 * Mirrors the pattern every booking app uses to keep the primary action within
 * thumb reach.
 */
export function MobileBar({
  rating,
  views,
}: {
  rating: number | null;
  views: number | null;
}) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <div className="container-page flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-bold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {rating !== null ? rating.toFixed(1).replace(".", ",") : "Belum dinilai"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatCount(views)} kali dilihat
          </p>
        </div>
        <a
          href="#rencana"
          className="shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          Rencanakan kunjungan
        </a>
      </div>
    </div>
  );
}
