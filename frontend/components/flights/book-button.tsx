"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Plane, ShieldCheck, Ticket } from "lucide-react";
import { bookAndPay } from "@/lib/booking-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

/**
 * Books the seat, then hands the reader to the Xendit invoice.
 *
 * Confirmed first because the seat is taken out of inventory the moment the
 * booking is created — so the dialog repeats the itinerary and the total
 * rather than asking "are you sure?" over a bare sentence.
 */
export function BookButton({ flight }: { flight: BookingSummary }) {
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    bookingId?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const book = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await bookAndPay(flight.id);

      if (result.ok) {
        // Xendit hosts the invoice, so this leaves the app entirely.
        window.location.assign(result.invoiceUrl);
        return;
      }

      setConfirming(false);
      setFailure(result);
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {pending ? "Menyiapkan pembayaran..." : "Pesan & bayar"}
      </button>

      <p className="text-xs leading-snug text-muted-foreground">
        Kursi ditahan begitu pesanan dibuat, lalu Anda diarahkan ke halaman
        pembayaran. Pesanan yang tidak dibayar sampai batas waktu akan dilepas
        kembali secara otomatis.
      </p>

      {failure && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
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
        <Itinerary flight={flight} />
      </ConfirmDialog>
    </div>
  );
}

function Itinerary({ flight }: { flight: BookingSummary }) {
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

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3.5 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total 1 penumpang</p>
          <p className="text-lg font-bold tabular-nums">
            {formatIDR(flight.price)}
          </p>
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
