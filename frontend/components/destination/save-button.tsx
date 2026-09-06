"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("destination");
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
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium underline-offset-4 transition hover:bg-brand-tint/10 hover:underline"
      >
        <Bookmark
          className={cn(
            "h-4 w-4 transition-colors",
            saved && "fill-brand-700 text-brand-700",
          )}
        />
        {saved ? t("savedName", { name }) : t("save")}
      </button>

      {pickerOpen && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label={t("saveToAlbum")}
        >
          <AlbumPicker destinationId={destinationId} onClose={closePicker} />
        </AnchoredPanel>
      )}
    </>
  );
}
