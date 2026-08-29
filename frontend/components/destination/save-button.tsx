"use client";

import { Bookmark } from "lucide-react";
import { useSaveToggle } from "@/lib/use-save-toggle";
import { cn } from "@/lib/utils";

/**
 * Inline "save" pill for the title row — the same bookmark as the heart on the
 * cards, in the shape the header needs.
 */
export function SaveButton({
  destinationId,
  name,
  initialSaved = false,
}: {
  destinationId: string;
  name: string;
  initialSaved?: boolean;
}) {
  const { saved, pending, toggle } = useSaveToggle(destinationId, initialSaved);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-busy={pending}
      onClick={() => void toggle()}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium underline-offset-4 transition hover:bg-brand-tint/10 hover:underline dark:hover:bg-brand-tint/15"
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-colors",
          saved && "fill-brand-700 text-brand-700 dark:fill-brand-100 dark:text-brand-100",
        )}
      />
      {saved ? `${name} tersimpan` : "Simpan"}
    </button>
  );
}
