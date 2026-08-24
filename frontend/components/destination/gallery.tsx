"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Booking-site hero: one large frame with a 2×2 mosaic beside it on desktop,
 * a single swipeable frame on mobile. Any frame opens a full-screen viewer.
 */
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted sm:aspect-[3/2] lg:col-span-2 lg:row-span-2 lg:aspect-auto"
        >
          <Image
            src={images[0]}
            alt={`Foto utama ${name}`}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </button>

        {images.slice(1, 5).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i + 1)}
            className={cn(
              "group relative aspect-[3/2] overflow-hidden rounded-2xl bg-muted",
              // Only the first pair survives the two-column tablet layout.
              i > 1 && "hidden sm:block",
            )}
          >
            <Image
              src={src}
              alt={`Foto ${name} ${i + 2}`}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            {i === 3 && (
              <span className="absolute inset-0 grid place-items-center bg-brand-900/45 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
                Lihat semua
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen(0)}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-card transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
      >
        <Images className="h-4 w-4" />
        {images.length} foto
      </button>

      {open !== null && (
        <Lightbox
          images={images}
          name={name}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  name,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  name: string;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const step = useCallback(
    (dir: 1 | -1) => onIndex((index + dir + images.length) % images.length),
    [index, images.length, onIndex],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  // The viewer covers the page, so the page behind it must not scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri foto ${name}`}
      className="fixed inset-0 z-[60] flex flex-col bg-brand-900/95 backdrop-blur"
    >
      <div className="flex items-center justify-between px-4 py-3 text-brand-50">
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup galeri"
          className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <Image
          src={images[index]}
          alt={`Foto ${name} ${index + 1}`}
          fill
          sizes="100vw"
          className="object-contain"
        />
        <ViewerArrow side="left" onClick={() => step(-1)} />
        <ViewerArrow side="right" onClick={() => step(1)} />
      </div>
    </div>
  );
}

function ViewerArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Foto sebelumnya" : "Foto berikutnya"}
      className={cn(
        "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}
