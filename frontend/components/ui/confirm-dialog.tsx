"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small confirmation modal built on the native `<dialog>` element — it brings
 * the focus trap, the Esc handling, and the backdrop for free, so no extra
 * Radix package is needed for the one place we ask "are you sure?".
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
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
      className="pointer-events-auto max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-foreground/40 sm:max-w-sm"
    >
      <div className="space-y-2 p-5">
        <h2
          id="confirm-dialog-title"
          className="font-display text-lg font-bold tracking-tight"
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 px-5 pb-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50",
            destructive
              ? "bg-destructive hover:bg-destructive/90"
              : "bg-brand-700 hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50",
          )}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
