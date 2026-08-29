"use client";

import { useEffect, useId, useRef } from "react";
import { Check, X } from "lucide-react";
import { SeatPicker } from "@/components/flights/seat-picker";
import { cn } from "@/lib/utils";

type Passenger = { name: string; seat: string | null };

/**
 * The seat map as a modal, on the same native `<dialog>` element the confirm
 * dialog uses — it brings the focus trap, Esc, and the backdrop for free.
 *
 * Unlike `ConfirmDialog` this one keeps the passenger tabs and the legend
 * pinned while only the cabin scrolls: with thirty rows, a reader who scrolls
 * to row 24 would otherwise lose sight of which passenger they are seating.
 *
 * There is nothing to cancel — every tap has already updated the booking form
 * behind it, so the only action is closing.
 */
export function SeatDialog({
  open,
  passengers,
  takenSeats,
  activeIndex,
  onActivate,
  onPick,
  onClose,
}: {
  open: boolean;
  passengers: Passenger[];
  takenSeats: string[];
  activeIndex: number;
  onActivate: (index: number) => void;
  onPick: (seat: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const taken = new Set(takenSeats);
  const chosen = passengers.map((p) => p.seat);
  const seated = passengers.filter((p) => p.seat).length;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: let React own the open state instead of the DOM closing behind it.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // The backdrop is part of the dialog box, so a click that lands on the
        // element itself rather than on its content came from outside the card.
        if (e.target === ref.current) onClose();
      }}
      // Same centring and `pointer-events-auto` notes as ConfirmDialog.
      //
      // No `display` utility here on purpose: a closed dialog is hidden by the
      // UA's `dialog:not([open]) { display: none }`, and any author-level
      // display class outranks it — putting `flex` here rendered the whole box
      // inline on the page. The column layout lives on the wrapper below.
      className="pointer-events-auto fixed left-1/2 top-1/2 m-0 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-pop duration-150 animate-in fade-in-0 backdrop:bg-foreground/50 backdrop:backdrop-blur-[2px]"
    >
      {/* Capped well short of the viewport: the cabin is thirty rows and would
          otherwise stretch the dialog to full height on any tall screen. Only
          this middle section scrolls, so the header, the passenger tabs, and
          the Selesai button all stay in view. */}
      <div className="flex max-h-[min(calc(100dvh-4rem),32rem)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-lg font-bold tracking-tight"
            >
              Pilih kursi
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {seated} dari {passengers.length} penumpang sudah berkursi. Tekan
              kursi yang sudah dipilih untuk melepasnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemilihan kursi"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border bg-muted/40 px-5 py-3">
          {passengers.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {passengers.map((passenger, index) => (
                <button
                  key={index}
                  type="button"
                  aria-pressed={activeIndex === index}
                  onClick={() => onActivate(index)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    activeIndex === index
                      ? "bg-brand-700 text-white dark:bg-brand-100 dark:text-brand-900"
                      : "border border-border bg-card hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15",
                  )}
                >
                  {passenger.name.trim() || `Penumpang ${index + 1}`}
                  {passenger.seat ? ` · ${passenger.seat}` : ""}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <Legend className="border-border bg-card" label="Tersedia" />
            <Legend
              className="border-brand-700 bg-brand-700 dark:border-brand-100 dark:bg-brand-100"
              label="Pilihan Anda"
            />
            <Legend
              className="border-transparent bg-muted"
              label="Sudah terisi"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-quiet">
          <SeatPicker
            taken={taken}
            chosen={chosen}
            activeIndex={activeIndex}
            onPick={onPick}
          />

          <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
            Denah ini memakai konfigurasi 3-3 yang umum dipakai pesawat
            domestik. Yang tercatat di sistem hanya nomor kursi yang sudah
            diambil, bukan denah asli pesawatnya, jadi posisi kursi bisa berbeda
            di hari keberangkatan.
          </p>
        </div>

        <div className="shrink-0 border-t border-border bg-muted/40 px-5 py-4">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            <Check className="h-4 w-4" />
            Selesai
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("h-4 w-4 rounded border", className)}
      />
      {label}
    </span>
  );
}
