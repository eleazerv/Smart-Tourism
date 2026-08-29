"use client";

import { Bookmark } from "lucide-react";
import { useSaveToggle } from "@/lib/use-save-toggle";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  destinationId,
  label,
  initialSaved = false,
  className,
}: {
  destinationId: string;
  label: string;
  /** Whether the signed-in reader has already saved this destination. */
  initialSaved?: boolean;
  className?: string;
}) {
  const { saved, pending, toggle } = useSaveToggle(destinationId, initialSaved);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-busy={pending}
      aria-label={saved ? `Hapus ${label} dari tersimpan` : `Simpan ${label}`}
      onClick={(event) => {
        // The bookmark sits on top of the cover, which is itself a link to the
        // destination — without this, saving also navigates away from the list.
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
      className={cn(
        "absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/85 backdrop-blur transition hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2",
        className,
      )}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-colors",
          saved
            ? "fill-brand-700 text-brand-700 dark:fill-brand-100 dark:text-brand-100"
            : "text-brand-900 dark:text-brand-50",
        )}
      />
    </button>
  );
}
