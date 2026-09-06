"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { cancelBooking, payBooking } from "@/lib/booking-actions";
import {
  cancelStayBooking,
  payStayBooking,
} from "@/lib/stay-booking-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTranslations } from "next-intl";

/**
 * Pay or release one pending booking, flight or accommodation.
 *
 * Payment leaves the app for the Xendit invoice; cancelling is confirmed first
 * because it hands the held seat or room back and cannot be undone.
 *
 * The two kinds hit different endpoints but behave identically from here, so
 * `kind` only picks the action pair and the noun in the confirmation.
 */
export function BookingActions({
  bookingId,
  kind = "flight",
}: {
  bookingId: string;
  kind?: "flight" | "stay";
}) {
  const t = useTranslations("bookings");
  const ui = useTranslations("ui");

  const actions =
    kind === "stay"
      ? { pay: payStayBooking, cancel: cancelStayBooking, held: t("rooms") }
      : { pay: payBooking, cancel: cancelBooking, held: t("seats") };

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, startPaying] = useTransition();
  const [cancelling, startCancelling] = useTransition();
  const router = useRouter();

  const pay = () => {
    setError(null);
    startPaying(async () => {
      const result = await actions.pay(bookingId);
      if (result.ok) {
        window.location.assign(result.invoiceUrl);
        return;
      }
      setError(result.message);
      // The status may have moved on underneath us — show what it is now.
      router.refresh();
    });
  };

  const cancel = () => {
    setError(null);
    startCancelling(async () => {
      const result = await actions.cancel(bookingId);
      setConfirming(false);
      if (!result.ok) setError(result.message);
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
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {paying ? t("openingPayment") : t("payNow")}
        </button>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" />
          {t("cancel")}
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
        title={t("cancelTitle")}
        description={t("cancelBody", { held: actions.held })}
        confirmLabel={cancelling ? "Membatalkan..." : "Ya, batalkan"}
        cancelLabel={ui("back")}
        destructive
        pending={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
