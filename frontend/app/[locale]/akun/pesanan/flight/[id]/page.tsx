import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, Plane, Search } from "lucide-react";
import { AccountSection } from "@/components/account/account-section";
import { BackLink } from "@/components/account/back-link";
import { BookingActions } from "@/components/account/booking-actions";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import {
  airportByCityId,
  clockOf,
  dateOf,
  durationMinutes,
  formatDuration,
  arrivalDayOffset,
} from "@/lib/airports";
import {
  getFlightBooking,
  type FlightBooking,
  type FlightBookingItem,
  type PaymentStatus,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { deadlinePassed, formatDateTime } from "@/lib/format-date";
import { formatDateLabel } from "@/lib/flights-search";
import { formatIDR } from "@/lib/seeded-random";
import { useLocale, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderDetail" });
  return { title: t("metaTitle") };
}

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default function BookingDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-5">
      <BackLink href="/akun/pesanan" labelKey="allBookings" />

      <Suspense fallback={<DetailSkeleton />}>
        <BookingDetail params={params} />
      </Suspense>
    </div>
  );
}

async function BookingDetail({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("orderDetail");
  const locale = await getLocale();
  const token = await requireAccessToken();

  let booking: FlightBooking | null;
  try {
    booking = await getFlightBooking(id, { token });
  } catch {
    return (
      <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        {t("loadError")}
      </p>
    );
  }

  // The API scopes the lookup to the signed-in user, so "not yours" and
  // "does not exist" arrive the same way — and should look the same too.
  if (!booking) notFound();

  const items = booking.flight_booking_items ?? [];
  // A closed booking holds no seats and owes nothing: it is shown as a record
  // of what was attempted, not as something still waiting on the reader.
  const closed = isClosed(booking.payment_status);
  const invoiceLive =
    booking.payment_status === "pending" &&
    booking.invoice_url !== null &&
    !deadlinePassed(booking.invoice_expires_at);

  return (
    <AccountSection
      title={booking.booking_code}
      description={t("bookedAt", {
        date: formatDateTime(booking.created_at, locale),
      })}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BookingStatus status={booking.payment_status} />
            <p
              className={
                closed
                  ? "text-lg font-bold tabular-nums text-muted-foreground line-through decoration-1"
                  : "text-lg font-bold tabular-nums"
              }
            >
              {formatIDR(booking.total_price)}
            </p>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            {booking.paid_at && (
              <Row
                label={t("paidAt")}
                value={formatDateTime(booking.paid_at, locale)}
              />
            )}
            {booking.payment_method && (
              <Row label={t("method")} value={booking.payment_method} />
            )}
            {booking.invoice_expires_at && booking.payment_status !== "paid" && (
              <Row
                label={closed ? t("deadlinePassed") : t("deadline")}
                value={formatDateTime(booking.invoice_expires_at, locale)}
              />
            )}
          </dl>

          {closed && <ClosedNotice status={booking.payment_status} />}

          {booking.payment_status === "pending" && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <BookingActions bookingId={booking.id} />
              {invoiceLive && booking.invoice_url && (
                <a
                  href={booking.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 underline underline-offset-2"
                >
                  {t("openInvoice")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noFlightItems")}
          </p>
        ) : (
          items.map((item) => (
            <ItemCard key={item.id} item={item} closed={closed} />
          ))
        )}
      </div>
    </AccountSection>
  );
}

/** Why a closed booking ended, and the one thing left to do about it. */
const CLOSED_COPY: Partial<
  Record<PaymentStatus, { titleKey: string; bodyKey: string }>
> = {
  failed: {
    titleKey: "failedTitle",
    bodyKey: "failedBody",
  },
  expired: {
    titleKey: "expiredTitle",
    bodyKey: "expiredBody",
  },
  cancelled: {
    titleKey: "cancelledTitle",
    bodyKey: "cancelledBody",
  },
};

function ClosedNotice({ status }: { status: PaymentStatus }) {
  const t = useTranslations("orderDetail");
  const flights = useTranslations("flights");
  const copy = CLOSED_COPY[status];
  if (!copy) return null;

  // Only a lapsed payment is the reader's loss to act on; a booking they
  // cancelled themselves is stated plainly, without the alarm colour.
  const alarming = status === "failed";

  return (
    <div
      className={
        alarming
          ? "mt-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4"
          : "mt-4 flex gap-3 rounded-xl border border-border bg-muted/50 p-4"
      }
    >
      <AlertTriangle
        aria-hidden="true"
        className={
          alarming
            ? "mt-0.5 h-5 w-5 shrink-0 text-rose-600"
            : "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
        }
      />

      <div className="min-w-0">
        <p className="text-sm font-semibold">{t(copy.titleKey)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(copy.bodyKey)}</p>

        <Link
          href="/flights"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          <Search className="h-4 w-4" />
          {flights("findFlightAgain")}
        </Link>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  closed,
}: {
  item: FlightBookingItem;
  closed: boolean;
}) {
  const t = useTranslations("orderDetail");
  const locale = useLocale();
  const flight = item.flight_options;

  if (!flight) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("noFlightData")}
      </div>
    );
  }

  const from = flight.origin ? airportByCityId(flight.origin.id) : null;
  const to = flight.destination ? airportByCityId(flight.destination.id) : null;
  const dayOffset = arrivalDayOffset(flight);

  return (
    <div
      className={
        closed
          ? "rounded-2xl border border-dashed border-border bg-muted/40 p-5"
          : "rounded-2xl border border-border bg-card p-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {item.flight_type === "return"
            ? t("returnFlight")
            : t("outboundFlight")}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatDateLabel(dateOf(flight.departure_time), locale)}
        </span>
      </div>

      <div className="mt-2">
        <p className="text-sm font-semibold">{flight.airline}</p>
        <p className="text-xs text-muted-foreground">{flight.flight_number}</p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-lg font-bold leading-none tabular-nums">
            {clockOf(flight.departure_time)}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {from?.code ?? flight.origin?.name ?? "—"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-center text-[11px] text-muted-foreground">
            {formatDuration(
                durationMinutes({
                    origin_city_id: flight.origin?.id ?? 0,
                    destination_city_id: flight.destination?.id ?? 0,
                    departure_time: flight.departure_time,
                    arrival_time: flight.arrival_time,
                }),
                )}          
            </p>
                    <div className="relative my-1 h-px bg-border">
            <Plane
              aria-hidden="true"
              className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
            />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold leading-none tabular-nums">
            {clockOf(flight.arrival_time)}
            {dayOffset > 0 && (
              <sup className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                +{dayOffset}
              </sup>
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {to?.code ?? flight.destination?.name ?? "—"}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{t("ticketPrice")}</span>
        <span
          className={
            closed
              ? "font-semibold tabular-nums text-muted-foreground line-through decoration-1"
              : "font-semibold tabular-nums"
          }
        >
          {formatIDR(item.price)}
        </span>
        {closed && (
          <span className="ml-2 text-xs text-muted-foreground">
            {t("ticketVoid")}
          </span>
        )}
      </p>
    </div>
  );
}

/** `invoice_expires_at` comes back without a zone; the API reads it as UTC. */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
