"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { payAccommodationBooking, cancelAccommodationBooking } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function AccommodationBookingActions({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, startPaying] = useTransition();
  const [cancelling, startCancelling] = useTransition();
  const router = useRouter();

  const pay = () => {
    setError(null);
    startPaying(async () => {
      const token = await getBrowserAccessToken();
      if (!token) return;
      try {
        const result = await payAccommodationBooking(bookingId, { token });
        window.location.assign(result.invoice_url);
      } catch {
        setError("Gagal membuka pembayaran. Coba lagi sebentar lagi.");
        router.refresh();
      }
    });
  };

  const cancel = () => {
    setError(null);
    startCancelling(async () => {
      const token = await getBrowserAccessToken();
      if (!token) return;
      try {
        await cancelAccommodationBooking(bookingId, { token });
      } catch {
        setError("Gagal membatalkan pesanan.");
      }
      setConfirming(false);
      router.refresh();
    });
  };

  const busy = paying || cancelling;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {paying ? "Membuka pembayaran..." : "Bayar sekarang"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" />
          Batalkan
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        icon={<XCircle className="h-5 w-5" />}
        title="Batalkan pesanan penginapan ini?"
        description="Kamar yang ditahan akan dilepas kembali dan tautan pembayarannya dimatikan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel={cancelling ? "Membatalkan..." : "Ya, batalkan"}
        cancelLabel="Kembali"
        destructive
        pending={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}