import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  ExternalLink,
  MapPinned,
  Search,
  Users,
} from "lucide-react";
import { AccountSection } from "@/components/account/account-section";
import { BackLink } from "@/components/account/back-link";
import { BookingActions } from "@/components/account/booking-actions";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import {
  getAccommodationBooking,
  type AccommodationBooking,
  type AccommodationBookingRoom,
  type PaymentStatus,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { deadlinePassed, formatDateTime } from "@/lib/format-date";
import { formatIDR } from "@/lib/seeded-random";
import { formatDateLabel } from "@/lib/stays-search";
import { useLocale, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderDetail" });
  return { title: t("metaTitleStay") };
}

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default function StayBookingDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-5">
      <BackLink href="/akun/pesanan" labelKey="allBookings" />

      <Suspense fallback={<DetailSkeleton />}>
        <StayBookingDetail params={params} />
      </Suspense>
    </div>
  );
}

async function StayBookingDetail({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("orderDetail");
  const stays = await getTranslations("stays");
  const locale = await getLocale();
  const token = await requireAccessToken();

  let booking: AccommodationBooking | null;
  try {
    booking = await getAccommodationBooking(id, { token });
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

  const rooms = booking.accommodation_booking_rooms ?? [];
  // A closed booking holds no rooms and owes nothing: it is shown as a record
  // of what was attempted, not as something still waiting on the reader.
  const closed = isClosed(booking.payment_status);
  const invoiceLive =
    booking.payment_status === "pending" &&
    booking.invoice_url !== null &&
    !deadlinePassed(booking.invoice_expires_at);

  const property = rooms[0]?.accommodations ?? null;

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
              <BookingActions bookingId={booking.id} kind="stay" />
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

        {property && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-brand-700">
              {stays(`tier.${property.tier}`)}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
              {property.name}
            </h2>
            {property.cities && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPinned aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {[property.cities.name, property.cities.provinces?.name]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {property.partner_name && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dikelola {property.partner_name}
              </p>
            )}

            {!closed && (
              <Link
                href={`/hotels/${property.id}`}
                className="mt-3 inline-block text-xs font-semibold text-brand-700 underline underline-offset-2"
              >
                Lihat halaman penginapan
              </Link>
            )}
          </section>
        )}

        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noRoomItems")}
          </p>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} closed={closed} />
          ))
        )}
      </div>
    </AccountSection>
  );
}

function RoomCard({
  room,
  closed,
}: {
  room: AccommodationBookingRoom;
  closed: boolean;
}) {
  const t = useTranslations("orderDetail");
  const locale = useLocale();

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
          <BedDouble className="h-4 w-4 text-brand-700" />
          {room.room_name}
        </h3>
        <p
          className={
            closed
              ? "text-sm font-bold tabular-nums text-muted-foreground line-through decoration-1"
              : "text-sm font-bold tabular-nums"
          }
        >
          {formatIDR(room.subtotal)}
        </p>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t("stayingLabel")}
            </dt>
            <dd className="font-medium">
              {formatDateLabel(room.check_in, locale)} –{" "}
              {formatDateLabel(room.check_out, locale)}{" "}
              <span className="text-muted-foreground">
                {t("nightsParen", { count: room.nights })}
              </span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t("guestsLabel")}
            </dt>
            <dd className="font-medium">
              {t("guestsValue", { count: room.guests })}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {t("rateNote", {
          price: formatIDR(room.price_per_night),
          nights: room.nights,
        })}
      </p>
    </section>
  );
}

/** Why a closed booking ended, and the one thing left to do about it. */
const CLOSED_COPY: Partial<
  Record<PaymentStatus, { titleKey: string; bodyKey: string }>
> = {
  failed: {
    titleKey: "failedTitle",
    bodyKey: "failedBodyStay",
  },
  expired: {
    titleKey: "expiredTitle",
    bodyKey: "expiredBodyStay",
  },
  cancelled: {
    titleKey: "cancelledTitle",
    bodyKey: "cancelledBodyStay",
  },
};

function ClosedNotice({ status }: { status: PaymentStatus }) {
  const t = useTranslations("orderDetail");
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
          href="/hotels"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          <Search className="h-4 w-4" />
          Cari penginapan lagi
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}


function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
