import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, Clock, TimerOff, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tone = { label: string; icon: LucideIcon; className: string };

const LABELS: Record<PaymentStatus, Tone> = {
  pending: {
    label: "Menunggu pembayaran",
    icon: Clock,
    className:
      "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  paid: {
    label: "Lunas",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  failed: {
    label: "Gagal terbayar",
    icon: XCircle,
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  expired: {
    label: "Kedaluwarsa",
    icon: TimerOff,
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: Ban,
    className: "bg-muted text-muted-foreground",
  },
};

/** Statuses where nothing more can be paid — the booking is closed for good. */
const CLOSED: PaymentStatus[] = ["failed", "expired", "cancelled"];

export function isClosed(status: PaymentStatus): boolean {
  return CLOSED.includes(status);
}

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
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  };
  const Icon = tone.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone.className,
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {tone.label}
    </span>
  );
}
