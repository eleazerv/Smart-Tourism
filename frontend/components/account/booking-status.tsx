import type { PaymentStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const LABELS: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: "Menunggu pembayaran",
    className:
      "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  paid: {
    label: "Lunas",
    className:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  expired: {
    label: "Kedaluwarsa",
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-muted text-muted-foreground",
  },
};

/** Payment state of a booking, in the same words across list and detail. */
export function BookingStatus({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  // The column is a plain text status, so an unknown value is shown as-is
  // rather than silently dropped.
  const tone = LABELS[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone.className,
        className,
      )}
    >
      {tone.label}
    </span>
  );
}
