"use client";

import { useCallback, useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import { MAX_GUESTS, MAX_ROOMS } from "@/lib/stays-search";

/**
 * Guests and rooms behind one field, opened by tapping anywhere on it — the
 * same shape as the other search fields.
 *
 * Steppers rather than two `<select>`s: the numbers are small and adjacent, so
 * plus and minus beat opening a dropdown to move from 2 to 3.
 */

const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 200;

/** The party the steppers open on once the reader engages with them. */
const START_GUESTS = 2;
const START_ROOMS = 1;

export function StayPartyPicker({
  guests,
  rooms,
  onChange,
}: {
  /** Null while the reader has not said — the field reads as unfilled then. */
  guests: number | null;
  rooms: number | null;
  onChange: (next: { guests: number; rooms: number }) => void;
}) {
  // The panel always has concrete numbers to step from; the trigger keeps
  // showing a placeholder until one of them is actually committed.
  const shownGuests = guests ?? START_GUESTS;
  const shownRooms = rooms ?? START_ROOMS;
  const chosen = guests !== null || rooms !== null;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, anchor } = useAnchoredPanel({
    open,
    onClose: close,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  });

  return (
    <div className="flex min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-brand-tint/10"
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tamu &amp; kamar
          </span>
          <span
            className={
              chosen
                ? "block truncate text-sm font-semibold"
                : "block truncate text-sm font-semibold text-muted-foreground"
            }
          >
            {chosen ? `${shownGuests} tamu, ${shownRooms} kamar` : "Pilih tamu"}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {!chosen
              ? "Belum diisi"
              : shownRooms > 1
                ? `${Math.ceil(shownGuests / shownRooms)} tamu per kamar`
                : "Satu kamar"}
          </span>
        </span>
      </button>

      {open && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label="Atur jumlah tamu dan kamar"
        >
          <Stepper
            label="Tamu"
            hint="Termasuk anak-anak"
            value={shownGuests}
            min={1}
            max={MAX_GUESTS}
            onChange={(next) => onChange({ guests: next, rooms: shownRooms })}
          />
          <div className="my-2 border-t border-border" />
          <Stepper
            label="Kamar"
            hint="Kapasitas dihitung per kamar"
            value={shownRooms}
            min={1}
            max={MAX_ROOMS}
            onChange={(next) => onChange({ guests: shownGuests, rooms: next })}
          />
        </AnchoredPanel>
      )}
    </div>
  );
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Round
          label={`Kurangi ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="h-4 w-4" />
        </Round>
        <span
          aria-live="polite"
          className="w-6 text-center text-sm font-semibold tabular-nums"
        >
          {value}
        </span>
        <Round
          label={`Tambah ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </Round>
      </div>
    </div>
  );
}

function Round({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border transition hover:bg-brand-tint/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
