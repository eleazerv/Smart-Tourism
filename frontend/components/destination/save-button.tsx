"use client";

import { Bookmark } from "lucide-react";
import { useSaveToggle } from "@/lib/use-save-toggle";
import { AlbumPicker } from "@/components/destination/album-picker";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import { cn } from "@/lib/utils";

/** Roughly a header, three album rows, and the "album baru" line. */
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 340;

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
  const { saved, pending, toggle, pickerOpen, closePicker } = useSaveToggle(
    destinationId,
    initialSaved,
  );
  const { triggerRef, panelRef, anchor } = useAnchoredPanel({
    open: pickerOpen,
    onClose: closePicker,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  });

  return (
    <>
      <button
        ref={triggerRef}
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

      {pickerOpen && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label="Simpan ke album"
        >
          <AlbumPicker destinationId={destinationId} onClose={closePicker} />
        </AnchoredPanel>
      )}
    </>
  );
}
