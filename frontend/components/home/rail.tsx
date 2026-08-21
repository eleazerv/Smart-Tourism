"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable row with overlaid arrow controls.
 * Arrows hide themselves at each end and on touch-sized viewports,
 * where swiping is the natural gesture.
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

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

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
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
      />
      <RailButton
        side="right"
        hidden={atEnd}
        onClick={() => scrollBy(1)}
        label={`Geser ${label} ke kanan`}
      />
    </div>
  );
}

function RailButton({
  side,
  hidden,
  onClick,
  label,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        "absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-brand-900 shadow-pop transition hover:bg-brand-tint/10 dark:text-brand-100 dark:hover:bg-brand-tint/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 md:grid",
        side === "left" ? "-left-4" : "-right-4",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
