"use client";

/**
 * Panel rencana — sisi "hasil" dari percakapan.
 *
 * Semua endpoint `/api/trips/...` membalas canvas utuh, jadi panel ini tidak
 * pernah menambal state-nya sendiri: setiap aksi mengganti seluruh rencana
 * dengan apa yang baru saja dikonfirmasi server. Itu yang menjaga panel ini
 * dan database tidak pernah berbeda cerita.
 */

import { useState } from "react";
import { Loader2, Plane, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/seeded-random";
import type { TripCanvas, TripItem } from "@/lib/api";

type Props = {
  canvas: TripCanvas | null;
  busy: boolean;
  onPatchItem: (
    itemId: string,
    patch: {
      status?: "suggested" | "confirmed";
      check_in?: string | null;
      check_out?: string | null;
    },
  ) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onDropFlight: (type: "outbound" | "return") => Promise<void>;
  onCheckout: () => Promise<void>;
};

const STATUS_LABEL: Record<string, string> = {
  suggested: "diusulkan",
  confirmed: "dikonfirmasi",
  booked: "dipesan",
};

function shortDate(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/**
 * Apa saja yang masih kurang sebelum rencana bisa dipesan, disebut per
 * destinasi. Tanpa daftar ini, tombol checkout yang mati tidak memberi tahu
 * bagian mana yang bolong dan pengguna harus menebak sendiri.
 */
function findGaps(canvas: TripCanvas): string[] {
  const gaps: string[] = [];

  for (const item of canvas.items) {
    if (item.status === "booked") continue;
    const name = item.destinations?.name ?? "Destinasi";
    if (item.status !== "confirmed") gaps.push(`${name} belum dikonfirmasi`);
    else if (!item.accommodations) gaps.push(`${name} belum punya penginapan`);
    else if (!item.check_in || !item.check_out)
      gaps.push(`${name} belum punya tanggal menginap`);
  }

  if (canvas.items.length > 0 && canvas.flights.length === 0) {
    gaps.push("Belum ada penerbangan dipilih");
  }
  return gaps;
}

export function PlanPanel({
  canvas,
  busy,
  onPatchItem,
  onRemoveItem,
  onDropFlight,
  onCheckout,
}: Props) {
  if (!canvas?.trip) {
    return (
      <p className="p-5 text-sm text-muted-foreground">
        Buka atau buat percakapan untuk melihat rencananya di sini.
      </p>
    );
  }

  const { trip, items, flights } = canvas;
  const gaps = findGaps(canvas);

  // Sama seperti backend: yang bisa dipesan adalah destinasi terkonfirmasi
  // yang lengkap, atau penerbangan yang sudah dipilih tapi belum dipesan.
  const ready =
    items.some(
      (i) =>
        i.status === "confirmed" && i.accommodations && i.check_in && i.check_out,
    ) || flights.some((f) => !f.booked_at);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">
          {trip.name ?? "Rencana tanpa nama"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {shortDate(trip.start_date) ?? "tanggal?"} →{" "}
          {shortDate(trip.end_date) ?? "?"} · {trip.travelers} orang
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section>
          <SectionTitle>Penerbangan</SectionTitle>
          {flights.length === 0 ? (
            <Empty>Belum ada. Minta dicarikan lewat chat.</Empty>
          ) : (
            <ul className="space-y-2">
              {flights.map((f) => (
                <li
                  key={f.flight_type}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Plane className="h-3.5 w-3.5" />
                      {f.flight_type === "outbound" ? "Berangkat" : "Pulang"}
                    </span>
                    {f.booked_at ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-700/40 dark:text-brand-50">
                        dipesan
                      </span>
                    ) : (
                      <span className="text-xs font-medium">
                        {f.flight_options
                          ? formatIDR(f.flight_options.price)
                          : "—"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm">
                    {f.flight_options?.airline} {f.flight_options?.flight_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.flight_options?.departure_time.slice(11, 16)} →{" "}
                    {f.flight_options?.arrival_time.slice(11, 16)}
                  </p>
                  {!f.booked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-7 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => onDropFlight(f.flight_type)}
                    >
                      Lepas pilihan
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Destinasi</SectionTitle>
          {items.length === 0 ? (
            <Empty>Belum ada. Ceritakan maumu lewat chat.</Empty>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  busy={busy}
                  onPatch={onPatchItem}
                  onRemove={onRemoveItem}
                />
              ))}
            </ul>
          )}
        </section>

        {gaps.length > 0 && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="mb-1 font-semibold">Belum siap dipesan</p>
            <ul className="space-y-0.5">
              {gaps.slice(0, 6).map((gap) => (
                <li key={gap}>· {gap}</li>
              ))}
              {gaps.length > 6 && <li className="opacity-75">dan {gaps.length - 6} lagi</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button
          className="w-full"
          disabled={!ready || busy}
          onClick={onCheckout}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {ready ? "Checkout rencana ini" : "Belum ada yang siap dipesan"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Semua pesanan lahir berstatus pending sampai dibayar.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function ItemCard({
  item,
  busy,
  onPatch,
  onRemove,
}: {
  item: TripItem;
  busy: boolean;
  onPatch: Props["onPatchItem"];
  onRemove: Props["onRemoveItem"];
}) {
  const [pending, setPending] = useState(false);
  const locked = item.status === "booked";
  const stay = item.accommodations;

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {String(item.sequence_order).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {item.destinations?.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[item.destinations?.cities?.name, item.destinations?.category]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {STATUS_LABEL[item.status] ?? item.status}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {stay ? (
          <>
            <span className="font-medium text-foreground">{stay.name}</span> ·{" "}
            {formatIDR(stay.price_per_night)}/malam
          </>
        ) : (
          "Belum pilih penginapan — minta AI carikan lewat chat."
        )}
      </p>

      {!locked && (
        <>
          <div className="mt-2 flex gap-2">
            <DateInput
              label="Check-in"
              value={item.check_in}
              disabled={busy || pending}
              onChange={(v) => run(() => onPatch(item.id, { check_in: v }))}
            />
            <DateInput
              label="Check-out"
              value={item.check_out}
              disabled={busy || pending}
              onChange={(v) => run(() => onPatch(item.id, { check_out: v }))}
            />
          </div>

          <div className="mt-2 flex gap-1.5">
            <Button
              size="sm"
              variant={item.status === "confirmed" ? "outline" : "default"}
              className="h-7 flex-1 text-xs"
              disabled={busy || pending}
              onClick={() =>
                run(() =>
                  onPatch(item.id, {
                    status:
                      item.status === "confirmed" ? "suggested" : "confirmed",
                  }),
                )
              }
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : item.status === "confirmed" ? (
                <>
                  <X className="h-3.5 w-3.5" /> Batalkan
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Konfirmasi
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive"
              aria-label={`Hapus ${item.destinations?.name ?? "destinasi"} dari rencana`}
              disabled={busy || pending}
              onClick={() => run(() => onRemove(item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function DateInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        title={label}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
      />
    </label>
  );
}
