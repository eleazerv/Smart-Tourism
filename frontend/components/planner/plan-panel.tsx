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
import {
  BedDouble,
  Check,
  ChevronDown,
  Loader2,
  Plane,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlightPicker } from "@/components/planner/flight-picker";
import { formatIDR } from "@/lib/seeded-random";
import { cn } from "@/lib/utils";
import {
  getDestinationAccommodations,
  type FlightOption,
  type NearbyAccommodation,
  type TripCanvas,
  type TripItem,
} from "@/lib/api";

const TIER_LABEL: Record<string, string> = {
  budget: "Hemat",
  mid: "Menengah",
  luxury: "Mewah",
};

type Props = {
  canvas: TripCanvas | null;
  busy: boolean;
  onPatchItem: (
    itemId: string,
    patch: {
      status?: "suggested" | "confirmed";
      accommodation_id?: string | null;
      check_in?: string | null;
      check_out?: string | null;
    },
  ) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onDropFlight: (type: "outbound" | "return") => Promise<void>;
  /** Sama dengan yang dipakai kartu pilihan di chat — satu jalur, satu perilaku. */
  onPickFlight: (
    option: FlightOption,
    type: "outbound" | "return",
  ) => Promise<void>;
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
 * Apa yang akan terjadi kalau tombol checkout ditekan sekarang.
 *
 * Dulu bagian ini berupa daftar "belum siap dipesan" yang menyebut tiap
 * destinasi tanpa penginapan sebagai kekurangan. Itu keliru dan bikin buntu:
 * backend tidak pernah mewajibkan penginapan atau penerbangan — ia memesan
 * yang sudah lengkap dan melewati sisanya tanpa mengeluh. Rencana berisi
 * delapan destinasi tanpa satu pun hotel tetap rencana yang sah.
 *
 * Jadi yang ditampilkan sekarang bukan kekurangan, melainkan ringkasan:
 * ini yang akan dipesan, ini yang tidak ikut, dan tidak ikut itu bukan
 * masalah. Syaratnya disalin persis dari `checkoutTrip` di backend supaya
 * ringkasan ini tidak pernah menjanjikan sesuatu yang berbeda.
 */
const MAX_FLIGHT_LEGS = 2;

function bookingPlan(canvas: TripCanvas) {
  const stays = canvas.items.filter(
    (item) =>
      item.status === "confirmed" &&
      item.accommodations &&
      item.check_in &&
      item.check_out,
  );
  const flights = canvas.flights.filter((flight) => !flight.booked_at);

  const skipped = canvas.items.filter(
    (item) => item.status !== "booked" && !stays.includes(item),
  );

  return {
    stays,
    flights,
    skipped,
    /** Backend menolak lebih dari dua kaki penerbangan dalam satu pemesanan. */
    tooManyFlights: flights.length > MAX_FLIGHT_LEGS,
    alreadyBooked:
      canvas.items.some((item) => item.status === "booked") ||
      canvas.flights.some((flight) => Boolean(flight.booked_at)),
  };
}

export function PlanPanel({
  canvas,
  busy,
  onPatchItem,
  onRemoveItem,
  onDropFlight,
  onPickFlight,
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
  const plan = bookingPlan(canvas);
  const ready = plan.stays.length > 0 || plan.flights.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="font-display text-base font-bold tracking-tight">
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
            <Empty>
              Belum ada penerbangan dipilih. Opsional — rencana tetap tersimpan
              tanpa tiket.
            </Empty>
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
                      <span className="rounded-full bg-brand-tint/10 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-tint/15 dark:text-brand-100">
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
                      className="mt-1 h-7 rounded-full px-2 text-xs text-destructive hover:text-destructive"
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

          <FlightPicker canvas={canvas} disabled={busy} onPick={onPickFlight} />
        </section>

        <section>
          <SectionTitle>Destinasi</SectionTitle>
          {items.length === 0 ? (
            <Empty>
              Belum ada destinasi. Ceritakan maumu lewat chat, atau tambahkan dari
              kartu yang ditawarkan AI.
            </Empty>
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

        {plan.tooManyFlights && (
          <div className="rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Rencana ini punya {plan.flights.length} penerbangan, sementara satu
            pemesanan cuma memuat dua (berangkat dan pulang). Lepaskan dulu yang
            berlebih sebelum checkout.
          </div>
        )}

        <BookingSummary plan={plan} />
      </div>

      <div className="border-t border-border p-4">
        <Button
          className="w-full rounded-full"
          disabled={!ready || busy}
          onClick={onCheckout}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {ready
            ? `Pesan ${summarise(plan)}`
            : plan.alreadyBooked
              ? "Semuanya sudah dipesan"
              : "Belum ada yang bisa dipesan"}
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

/** Label tombol checkout: menyebut apa yang akan dipesan, bukan "checkout". */
function summarise(plan: ReturnType<typeof bookingPlan>) {
  const parts: string[] = [];
  if (plan.stays.length) parts.push(`${plan.stays.length} penginapan`);
  if (plan.flights.length) parts.push(`${plan.flights.length} penerbangan`);
  return parts.join(" & ");
}

/**
 * Ringkasan apa yang akan dan tidak akan dipesan.
 *
 * Nadanya sengaja netral, bukan peringatan: destinasi tanpa penginapan itu
 * pilihan yang sah, bukan kesalahan yang perlu diperbaiki. Menyebutnya di sini
 * cuma supaya tidak ada kejutan setelah tombolnya ditekan.
 */
function BookingSummary({ plan }: { plan: ReturnType<typeof bookingPlan> }) {
  const bookable = plan.stays.length > 0 || plan.flights.length > 0;

  if (!bookable) {
    return (
      <p className="rounded-2xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">
        {plan.alreadyBooked
          ? "Semua yang siap dipesan di rencana ini sudah dipesan. Lanjutkan pembayarannya di halaman Pesanan."
          : "Rencana ini tersimpan apa adanya. Penginapan dan penerbangan sifatnya opsional — isi salah satunya kalau kamu memang mau memesan lewat sini."}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border p-3 text-xs leading-relaxed">
      <p className="mb-1.5 font-semibold">Yang akan dipesan</p>
      <ul className="space-y-1 text-muted-foreground">
        {plan.flights.map((flight) => (
          <li key={flight.flight_type}>
            · Penerbangan{" "}
            {flight.flight_type === "outbound" ? "berangkat" : "pulang"} —{" "}
            {flight.flight_options?.airline}{" "}
            {flight.flight_options?.flight_number}
          </li>
        ))}
        {plan.stays.map((item) => (
          <li key={item.id}>
            · {item.accommodations?.name} di {item.destinations?.name}
          </li>
        ))}
      </ul>

      {plan.skipped.length > 0 && (
        <p className="mt-2 text-muted-foreground">
          {plan.skipped.length} destinasi lain tidak ikut dipesan karena belum
          punya penginapan atau tanggal. Itu tidak apa-apa — rencananya tetap
          tersimpan.
        </p>
      )}
    </div>
  );
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
          "Belum pilih penginapan — opsional, hanya perlu kalau mau dipesan lewat sini."
        )}
      </p>

      {!locked && (
        <>
          <StayPicker
            destinationId={item.destinations?.id ?? null}
            destinationName={item.destinations?.name ?? "destinasi ini"}
            selectedId={stay?.id ?? null}
            disabled={busy || pending}
            onPick={(accommodationId) =>
              run(() => onPatch(item.id, { accommodation_id: accommodationId }))
            }
          />

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
              className="h-7 flex-1 rounded-full text-xs"
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
              className="h-7 rounded-full px-2 text-destructive hover:text-destructive"
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

/**
 * Pemilih penginapan langsung di panel.
 *
 * Tanpa ini, satu-satunya jalan mengisi penginapan adalah meminta AI
 * mencarikannya — dan daftar "belum siap dipesan" jadi buntu: ia menyebut apa
 * yang kurang tapi tidak memberi cara memperbaikinya. Daftarnya diambil dari
 * endpoint yang sama dengan yang dipakai AI, sudah terurut dari yang terdekat
 * ke destinasi, jadi pilihan lewat panel dan lewat chat selalu sama isinya.
 *
 * Dimuat saat dibuka, bukan saat kartunya dirender: rencana berisi delapan
 * destinasi akan menembak delapan permintaan sekaligus untuk daftar yang
 * mungkin tidak satu pun dibuka.
 */
function StayPicker({
  destinationId,
  destinationName,
  selectedId,
  disabled,
  onPick,
}: {
  destinationId: string | null;
  destinationName: string;
  selectedId: string | null;
  disabled: boolean;
  onPick: (accommodationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<NearbyAccommodation[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || options || !destinationId) return;

    try {
      setFailed(false);
      setOptions(await getDestinationAccommodations(destinationId));
    } catch {
      setFailed(true);
    }
  }

  if (!destinationId) return null;

  return (
    <div className="mt-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-full rounded-full text-xs"
        disabled={disabled}
        onClick={toggle}
        aria-expanded={open}
      >
        <BedDouble className="h-3.5 w-3.5" />
        {selectedId ? "Ganti penginapan" : "Pilih penginapan"}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border">
          {options === null && !failed && (
            <p className="flex items-center gap-1.5 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat penginapan…
            </p>
          )}

          {failed && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Daftar penginapan belum bisa dimuat. Coba lagi sebentar lagi.
            </p>
          )}

          {options?.length === 0 && (
            <p className="px-3 py-4 text-xs leading-relaxed text-muted-foreground">
              Belum ada penginapan terdaftar di kota {destinationName}.
            </p>
          )}

          <ul className="divide-y divide-border">
            {options?.map((option) => {
              const picked = option.id === selectedId;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={disabled || picked}
                    onClick={() => {
                      onPick(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition",
                      picked
                        ? "bg-brand-tint/10 dark:bg-brand-tint/15"
                        : "hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {option.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {TIER_LABEL[option.tier] ?? option.tier} ·{" "}
                        {formatIDR(option.price_per_night)}/malam
                        {option.distance_km != null &&
                          ` · ${option.distance_km} km`}
                      </span>
                    </span>
                    {picked && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-700 dark:text-brand-100" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
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
