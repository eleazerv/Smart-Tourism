"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A popover pinned to the field that opened it.
 *
 * Portalled to `<body>` and positioned from the trigger rectangle rather than
 * nested under it: the search hero clips its overflow, which would cut any
 * panel that hangs below the form.
 */

export type Anchor = { top: number; left: number; width: number };

const MARGIN = 8;

export function useAnchoredPanel({
  open,
  onClose,
  height,
  width,
  minWidth = 280,
}: {
  open: boolean;
  onClose: () => void;
  /** Rough panel height, used to decide whether it flips above the trigger. */
  height: number;
  /** Fixed width. Omitted means "as wide as the trigger, within reason". */
  width?: number;
  minWidth?: number;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const available = window.innerWidth - MARGIN * 2;
    const panelWidth = Math.min(
      width ?? Math.max(rect.width, minWidth),
      available,
    );
    const below = window.innerHeight - rect.bottom;

    setAnchor({
      // Flips above the field when the space under it cannot hold the panel.
      top:
        below < height && rect.top > below
          ? Math.max(rect.top - height - MARGIN, MARGIN)
          : rect.bottom + MARGIN,
      left: Math.min(
        Math.max(rect.left, MARGIN),
        window.innerWidth - panelWidth - MARGIN,
      ),
      width: panelWidth,
    });
  }, [height, width, minWidth]);

  useEffect(() => {
    if (!open) return;

    place();
    window.addEventListener("resize", place);
    // Capture phase: the field can sit inside its own scrolling ancestor.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return { triggerRef, panelRef, anchor };
}

/** Renders the panel itself, once `useAnchoredPanel` has measured the field. */
export function AnchoredPanel({
  anchor,
  panelRef,
  label,
  className,
  children,
}: {
  anchor: Anchor | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (anchor === null) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
      className={cn(
        "fixed z-50 rounded-2xl border border-border bg-card p-3 text-foreground shadow-pop",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
