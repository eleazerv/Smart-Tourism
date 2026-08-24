"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Hapus ${label} dari tersimpan` : `Simpan ${label}`}
      onClick={() => setSaved((v) => !v)}
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
