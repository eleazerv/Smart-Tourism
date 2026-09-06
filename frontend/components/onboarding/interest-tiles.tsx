"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { Tag } from "@/lib/api";
import { tagImage } from "@/lib/tag-image";
import { cn } from "@/lib/utils";

/**
 * Memilih tema lewat foto jauh lebih cepat daripada membaca deretan chip —
 * itu sebabnya langkah ini yang mendapat gambar, dan satu-satunya yang punya.
 *
 * Katalognya 24 tag dan bisa terus bertambah, jadi petaknya digulung di dalam
 * kotak setinggi tiga baris alih-alih memanjangkan halaman. Ini sekaligus
 * yang paling ringan: `next/image` menunda unduhan gambar yang belum masuk
 * layar, dan baris di bawah lipatan memang belum masuk layar.
 */
export function InterestTiles({
  allTags,
  chosen,
  onToggle,
}: {
  allTags: Tag[];
  chosen: Set<string>;
  onToggle: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);

  /** Peluruh di tepi bawah hanya masuk akal selama masih ada yang di bawah. */
  const syncEdge = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const room = element.scrollHeight - element.clientHeight;
    setAtEnd(room <= 0 || element.scrollTop >= room - 8);
  }, []);

  // Dijalankan sekali setelah petak terpasang: kalau temanya sedikit dan muat
  // seluruhnya, tidak ada peristiwa gulir yang akan mematikan peluruhnya.
  useEffect(syncEdge, [syncEdge, allTags.length]);

  // Katalog tema gagal dimuat. Jangan kunci orang di sini — langkah ini bisa
  // dilewati dan diisi belakangan.
  if (allTags.length === 0) {
    return (
      <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        Daftar tema sedang tidak bisa dimuat. Lanjutkan saja — minat bisa
        dipilih kapan pun lewat Akun → Minat perjalanan.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={syncEdge}
        className="scrollbar-quiet -mx-1 max-h-[24rem] overflow-y-auto px-1 py-1"
      >
        {/* `px-1 py-1` di atas memberi ruang untuk `ring-offset` petak yang
            terpilih; tanpa itu cincinnya terpotong di tepi kotak gulir. */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allTags.map((tag) => {
            const active = chosen.has(tag.id);
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => onToggle(tag.id)}
                  aria-pressed={active}
                  className={cn(
                    "group relative block aspect-[3/2] w-full overflow-hidden rounded-2xl bg-brand-900 text-left transition",
                    active
                      ? "ring-2 ring-brand-700 ring-offset-2 ring-offset-background"
                      : "hover:opacity-95",
                  )}
                >
                  <Image
                    src={tagImage(tag.slug)}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 180px, 45vw"
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 transition-colors",
                      active
                        ? "bg-brand-900/25"
                        : "bg-brand-900/45 group-hover:bg-brand-900/35",
                    )}
                  />
                  {active && (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white shadow-pop"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-3 text-sm font-semibold leading-tight text-white">
                    {tag.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Memudar ke `background`, bukan `transparent`: gradien ke transparan
          melewati abu-abu di Safari dan meninggalkan pita kotor. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-background/0 transition-opacity duration-200",
          atEnd && "opacity-0",
        )}
      />
    </div>
  );
}
