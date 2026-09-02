"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable row with overlaid arrow controls.
 * Arrows hide themselves at each end and on touch-sized viewports,
 * where swiping is the natural gesture.
 *
 * The arrows line up with the middle of the card artwork rather than the
 * middle of the rail: most cards carry a caption under the image, so centring
 * on the whole card leaves the buttons sitting visibly low. Cards mark their
 * artwork with `data-rail-media` for this; without it the arrows fall back to
 * the rail's own centre.
 */
export function Rail({
  children,
  className,
  itemClassName,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  label: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [mediaCenter, setMediaCenter] = useState<number | null>(null);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  // Measured rather than derived from the aspect ratio, because each rail
  // picks its own — and some of them change it at a breakpoint.
  //
  // The observer watches the rail itself, not the artwork: a rail whose cards
  // stream in behind Suspense has no artwork to find on the first pass, and
  // watching an element that does not exist yet would leave the arrows stuck
  // at their fallback position for good.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const measure = () => {
      const media = root.querySelector<HTMLElement>("[data-rail-media]");
      if (!media) return;

      const mediaBox = media.getBoundingClientRect();
      if (mediaBox.height === 0) return;

      setMediaCenter(
        mediaBox.top - root.getBoundingClientRect().top + mediaBox.height / 2,
      );
    };

    measure();
    // A second pass after paint, for the case where the cards are in the DOM
    // but the browser has not sized their images yet.
    const frame = requestAnimationFrame(measure);

    const observer = new ResizeObserver(measure);
    observer.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        ref={trackRef}
        onScroll={sync}
        role="group"
        aria-label={label}
        className={cn(
          "no-scrollbar -mx-1 flex snap-x snap-mandatory scroll-pl-1 gap-4 overflow-x-auto scroll-smooth px-1 pb-2",
          itemClassName,
        )}
      >
        {children}
      </div>

      <RailButton
        side="left"
        hidden={atStart}
        onClick={() => scrollBy(-1)}
        label={`Geser ${label} ke kiri`}
        center={mediaCenter}
      />
      <RailButton
        side="right"
        hidden={atEnd}
        onClick={() => scrollBy(1)}
        label={`Geser ${label} ke kanan`}
        center={mediaCenter}
      />
    </div>
  );
}

/**
 * The arrows float over the cards, so their hover state is a solid fill
 * rather than the translucent tint wash used elsewhere: a low-alpha wash
 * lets the artwork behind bleed through and the chevron stops reading.
 */
function RailButton({
  side,
  hidden,
  onClick,
  label,
  center,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
  label: string;
  /** Distance from the rail's top to the artwork's midline, in pixels. */
  center: number | null;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={hidden ? -1 : 0}
      style={center === null ? undefined : { top: center }}
      className={cn(
        "absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-brand-900 shadow-pop transition duration-200 hover:scale-105 hover:border-brand-700 hover:bg-brand-700 hover:text-brand-50 active:scale-95 dark:bg-card dark:text-brand-100 dark:hover:border-brand-100 dark:hover:bg-brand-100 dark:hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-brand-100 md:grid",
        side === "left" ? "-left-4" : "-right-4",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
