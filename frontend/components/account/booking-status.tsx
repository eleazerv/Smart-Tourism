import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, Clock, TimerOff, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Label ditinggalkan di kamus (`bookings.status`); yang tersisa di sini
// hanya ikon dan warnanya.
type Tone = { icon: LucideIcon; className: string };

const LABELS: Record<PaymentStatus, Tone> = {
  pending: { icon: Clock, className: "bg-amber-50 text-amber-800" },
  paid: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-800" },
  failed: { icon: XCircle, className: "bg-rose-50 text-rose-700" },
  expired: { icon: TimerOff, className: "bg-muted text-muted-foreground" },
  cancelled: { icon: Ban, className: "bg-muted text-muted-foreground" },
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
  const t = useTranslations("bookings");

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
      {t(`status.${status}`)}
    </span>
  );
}
