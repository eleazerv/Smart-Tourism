"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CreditCard, Loader2 } from "lucide-react";
import { bookAndPay } from "@/lib/booking-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatIDR } from "@/lib/seeded-random";

/**
 * Books the seat, then hands the reader to the Xendit invoice.
 *
 * Confirmed first because the seat is taken out of inventory the moment the
 * booking is created — this button has a consequence even if the payment page
 * is then abandoned.
 */
export function BookButton({
  flightId,
  price,
}: {
  flightId: string;
  price: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    bookingId?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const book = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await bookAndPay(flightId);

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
        pembayaran. Pesanan yang tidak dibayar sampai batas waktu akan
        dilepas kembali secara otomatis.
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
        title="Pesan kursi ini?"
        description={`Satu kursi seharga ${formatIDR(price)} akan ditahan atas nama Anda, lalu halaman pembayaran dibuka.`}
        confirmLabel={pending ? "Memproses..." : "Ya, pesan"}
        pending={pending}
        onConfirm={book}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
