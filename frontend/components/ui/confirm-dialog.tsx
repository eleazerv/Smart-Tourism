"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Confirmation modal built on the native `<dialog>` element — it brings the
 * focus trap, the Esc handling, and the backdrop for free, so no extra Radix
 * package is needed for the places we ask "are you sure?".
 *
 * `children` carry whatever the decision needs to be an informed one: the
 * booking step shows the itinerary and the total, a sign-out only needs a line
 * of text.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmLabel,
  confirmIcon,
  cancelLabel,
  destructive = false,
  pending = false,
  footnote,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  /** Small mark above the title. */
  icon?: React.ReactNode;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  /** Fine print under the actions — who processes a payment, say. */
  footnote?: React.ReactNode;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    // Ditutup juga saat komponennya pergi. Dialog modal hidup di top layer
    // browser, bukan sekadar di pohon React, jadi komponen yang menghilang
    // selagi dialognya terbuka -- misalnya karena sesinya berakhir dan
    // pemiliknya berhenti merendernya -- berpotensi meninggalkan lapisan
    // yang memblokir halaman di belakangnya.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: let React own the open state instead of the DOM closing behind it.
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        // The backdrop is part of the dialog box, so a click that lands on the
        // element itself rather than on its content came from outside the card.
        if (e.target === ref.current && !pending) onCancel();
      }}
      // `pointer-events-auto`: a Radix menu that is still animating closed keeps
      // `pointer-events: none` on <body>, which the dialog would inherit.
      // Centred explicitly rather than through the UA's `margin: auto`, which
      // a modal loses as soon as anything sets a margin on it. A dialog taller
      // than the viewport scrolls inside itself instead of overflowing.
      //
      // Fade only: `zoom-in` animates `transform`, which would fight the
      // translate that does the centring and make the box slide in from the
      // lower right.
      className="pointer-events-auto fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-pop duration-150 animate-in fade-in-0 backdrop:bg-foreground/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5">
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              "mb-3 grid h-11 w-11 place-items-center rounded-full",
              destructive
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-tint/10 text-brand-700",
            )}
          >
            {icon}
          </span>
        )}

        <h2
          id={titleId}
          className="font-display text-lg font-bold tracking-tight"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}
      </div>

      <div className="border-t border-border bg-muted/40 px-5 py-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60",
              destructive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-brand-700 hover:bg-brand-900",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmIcon
            )}
            {confirmLabel}
          </button>
        </div>

        {footnote && (
          <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground sm:text-right">
            {footnote}
          </p>
        )}
      </div>
    </dialog>
  );
}
