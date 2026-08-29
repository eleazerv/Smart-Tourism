"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArmchairIcon,
  CreditCard,
  Loader2,
  Plane,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import { bookAndPay } from "@/lib/booking-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SeatDialog } from "@/components/flights/seat-dialog";
import { clockOf, formatDuration } from "@/lib/airports";
import { formatIDR } from "@/lib/seeded-random";

/** What the confirmation shows before any seat is taken out of inventory. */
export type BookingSummary = {
  id: string;
  airline: string;
  flightNumber: string;
  /** Naive `YYYY-MM-DDTHH:mm:ss`, as the flights API stores them. */
  departureTime: string;
  arrivalTime: string;
  durationMin: number;
  fromLabel: string;
  toLabel: string;
  dateLabel: string;
  price: number;
  seatsLeft: number;
};

/** The API caps a single booking at ten names. */
const MAX_PASSENGERS = 10;

type Passenger = { name: string; seat: string | null };

/**
 * Passenger details, seat choice, and the booking action.
 *
 * The total moves with the passenger count, so the price breakdown and the
 * button live here rather than in the page's sidebar — a total that updates
 * out of view is a total nobody trusts.
 */
export function BookingForm({
  flight,
  takenSeats,
  defaultName,
}: {
  flight: BookingSummary;
  takenSeats: string[];
  /** The signed-in reader's own name, prefilled for the first passenger. */
  defaultName: string;
}) {
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: defaultName, seat: null },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [seatOpen, setSeatOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    bookingId?: string;
  } | null>(null);
  const [warning, setWarning] = useState<{
    message: string;
    invoiceUrl: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const total = flight.price * passengers.length;
  const maxPassengers = Math.max(
    1,
    Math.min(MAX_PASSENGERS, flight.seatsLeft || MAX_PASSENGERS),
  );

  const setCount = (next: number) => {
    setPassengers((current) => {
      if (next > current.length) {
        return [
          ...current,
          ...Array.from({ length: next - current.length }, () => ({
            name: "",
            seat: null,
          })),
        ];
      }
      return current.slice(0, next);
    });
    setActiveIndex((i) => Math.min(i, next - 1));
    setErrors([]);
  };

  const rename = (index: number, name: string) => {
    setPassengers((current) =>
      current.map((p, i) => (i === index ? { ...p, name } : p)),
    );
    setErrors([]);
  };

  const pickSeat = (seat: string) => {
    // Tapping a seat this booking already holds clears it, so a mistake can be
    // undone without first hunting for the passenger it belongs to.
    const held = passengers.findIndex((p) => p.seat === seat);
    const next =
      held >= 0
        ? passengers.map((p, i) => (i === held ? { ...p, seat: null } : p))
        : passengers.map((p, i) => (i === activeIndex ? { ...p, seat } : p));

    setPassengers(next);

    if (held >= 0) {
      setActiveIndex(held);
      return;
    }
    // Advance to whoever still has no seat, so a group can tap straight
    // through without reaching for the passenger tabs between each one.
    const unseated = next.findIndex((p) => !p.seat);
    if (unseated >= 0) setActiveIndex(unseated);
  };

  const validate = (): boolean => {
    const missing = passengers
      .map((p, i) => (p.name.trim() ? null : i + 1))
      .filter((n): n is number => n !== null);
    if (missing.length > 0) {
      setErrors([
        missing.length === passengers.length
          ? "Isi nama setiap penumpang dulu."
          : `Nama penumpang ${missing.join(", ")} masih kosong.`,
      ]);
      return false;
    }
    setErrors([]);
    return true;
  };

  const book = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await bookAndPay(
        flight.id,
        passengers.map((p) => ({ name: p.name.trim(), seat: p.seat })),
      );

      if (result.ok) {
        if (result.seatWarning) {
          // Redirecting straight to Xendit would bury this — the reader needs
          // to know a seat was lost before they leave the app.
          setConfirming(false);
          setWarning({
            message: result.seatWarning,
            invoiceUrl: result.invoiceUrl,
          });
          return;
        }
        // Xendit hosts the invoice, so this leaves the app entirely.
        window.location.assign(result.invoiceUrl);
        return;
      }

      setConfirming(false);
      setFailure(result);
    });
  };

  const seatedCount = passengers.filter((p) => p.seat).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <UserRound className="h-4 w-4 text-brand-700 dark:text-brand-100" />
            Penumpang
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Jumlah</span>
            <select
              value={passengers.length}
              onChange={(event) => setCount(Number(event.target.value))}
              className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
            >
              {Array.from({ length: maxPassengers }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n} orang
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <p className="mt-1.5 text-sm text-muted-foreground">
          Tulis nama persis seperti di KTP atau paspor. Satu tiket diterbitkan
          untuk setiap nama.
        </p>

        <ul className="mt-4 space-y-3">
          {passengers.map((passenger, index) => (
            <li key={index}>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Penumpang {index + 1}
                  {passenger.seat && (
                    <span className="ml-1.5 font-semibold text-brand-700 dark:text-brand-100">
                      · kursi {passenger.seat}
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  value={passenger.name}
                  onChange={(event) => rename(index, event.target.value)}
                  onFocus={() => setActiveIndex(index)}
                  placeholder="Nama lengkap"
                  autoComplete={index === 0 ? "name" : "off"}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
                />
              </label>
            </li>
          ))}
        </ul>

        {errors.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errors[0]}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <ArmchairIcon className="h-4 w-4 text-brand-700 dark:text-brand-100" />
            Kursi
          </h2>
          <button
            type="button"
            onClick={() => setSeatOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:text-brand-100 dark:hover:border-brand-100 dark:hover:bg-brand-700/30"
          >
            <ArmchairIcon className="h-4 w-4" />
            {seatedCount > 0 ? "Ubah kursi" : "Pilih kursi"}
          </button>
        </div>

        <p className="mt-1.5 text-sm text-muted-foreground">
          Opsional — pesanan tetap bisa dilanjutkan tanpa memilih kursi, dan
          nomor kursi masih bisa diatur dari halaman pesanan.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm">
          {passengers.map((passenger, index) => (
            <li
              key={index}
              className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5 last:border-b-0 last:pb-0"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {passenger.name.trim() || `Penumpang ${index + 1}`}
              </span>
              <span
                className={
                  passenger.seat
                    ? "shrink-0 font-semibold tabular-nums text-brand-700 dark:text-brand-100"
                    : "shrink-0 text-xs text-muted-foreground"
                }
              >
                {passenger.seat ?? "Belum dipilih"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <h2 className="font-display text-base font-bold tracking-tight">
          Rincian harga
        </h2>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              Tarif × {passengers.length} penumpang
            </dt>
            <dd className="tabular-nums">{formatIDR(flight.price)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatIDR(total)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => {
            if (validate()) setConfirming(true);
          }}
          disabled={pending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {pending ? "Menyiapkan pembayaran..." : "Pesan & bayar"}
        </button>

        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          Kursi ditahan begitu pesanan dibuat, lalu Anda diarahkan ke halaman
          pembayaran. Pesanan yang tidak dibayar sampai batas waktu akan dilepas
          kembali secara otomatis.
        </p>

        {failure && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p>{failure.message}</p>
            {failure.bookingId && (
              <Link
                href={`/akun/pesanan/${failure.bookingId}`}
                className="mt-1.5 inline-block font-semibold underline underline-offset-2"
              >
                Buka pesanan untuk mencoba bayar lagi
              </Link>
            )}
          </div>
        )}

        {warning && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <p>{warning.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign(warning.invoiceUrl)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white dark:bg-brand-100 dark:text-brand-900"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Lanjut ke pembayaran
            </button>
          </div>
        )}
      </section>

      <SeatDialog
        open={seatOpen}
        passengers={passengers}
        takenSeats={takenSeats}
        activeIndex={activeIndex}
        onActivate={setActiveIndex}
        onPick={pickSeat}
        onClose={() => setSeatOpen(false)}
      />

      <ConfirmDialog
        open={confirming}
        icon={<Ticket className="h-5 w-5" />}
        title="Konfirmasi pesanan"
        description="Periksa sekali lagi sebelum kursinya ditahan atas nama Anda."
        confirmLabel={pending ? "Memproses..." : "Lanjut ke pembayaran"}
        confirmIcon={<CreditCard className="h-4 w-4" />}
        cancelLabel="Kembali"
        pending={pending}
        footnote="Pembayaran diproses oleh Xendit di halaman terpisah."
        onConfirm={book}
        onCancel={() => setConfirming(false)}
      >
        <Itinerary flight={flight} passengers={passengers} total={total} />
      </ConfirmDialog>
    </div>
  );
}

function Itinerary({
  flight,
  passengers,
  total,
}: {
  flight: BookingSummary;
  passengers: Passenger[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{flight.airline}</p>
          <p className="text-xs text-muted-foreground">
            {flight.flightNumber} &middot; {flight.dateLabel}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Endpoint
            time={clockOf(flight.departureTime)}
            label={flight.fromLabel}
          />

          <div className="min-w-0 flex-1">
            <p className="text-center text-[11px] text-muted-foreground">
              {formatDuration(flight.durationMin)}
            </p>
            <div className="relative my-1 h-px bg-border">
              <Plane
                aria-hidden="true"
                className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
              />
            </div>
            <p className="text-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Langsung
            </p>
          </div>

          <Endpoint
            time={clockOf(flight.arrivalTime)}
            label={flight.toLabel}
            align="right"
          />
        </div>
      </div>

      <ul className="space-y-1.5 rounded-xl border border-border p-3.5 text-sm">
        {passengers.map((passenger, index) => (
          <li key={index} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-medium">
              {passenger.name.trim()}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {passenger.seat ? `Kursi ${passenger.seat}` : "Tanpa kursi"}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Total {passengers.length} penumpang
          </p>
          <p className="text-lg font-bold tabular-nums">{formatIDR(total)}</p>
        </div>
        <p className="text-right text-[11px] leading-snug text-muted-foreground">
          {flight.seatsLeft <= 5
            ? `Tinggal ${flight.seatsLeft} kursi`
            : `${flight.seatsLeft} kursi tersedia`}
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-3.5 py-3 text-[11px] leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
        <span>
          Kursi ditahan sejak pesanan dibuat, bukan setelah dibayar. Kalau
          pembayaran tidak selesai sampai batas waktu, kursinya dilepas lagi dan
          pesanan ini hangus.
        </span>
      </p>
    </div>
  );
}

function Endpoint({
  time,
  label,
  align = "left",
}: {
  time: string;
  label: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "shrink-0 text-right" : "shrink-0"}>
      <p className="text-base font-bold leading-none tabular-nums">{time}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
