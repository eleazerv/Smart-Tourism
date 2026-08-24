"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline "save" pill for the title row — the same local-only bookmark as the
 * heart on the cards, in the shape the header needs. There is no favourites
 * table behind it yet, so the state lives in this component.
 */
export function SaveButton({ name }: { name: string }) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => setSaved((v) => !v)}
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
