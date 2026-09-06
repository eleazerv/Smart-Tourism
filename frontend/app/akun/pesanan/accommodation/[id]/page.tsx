import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BedDouble, ExternalLink, Search } from "lucide-react";
import { AccountSection } from "@/components/account/account-section";
import { AccommodationBookingActions } from "@/components/account/accommodation-booking-actions";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import {
  getAccommodationBooking,
  type AccommodationBooking,
  type AccommodationBookingRoom,
  type PaymentStatus,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { formatDateTime } from "@/lib/format-date";
import { formatIDR } from "@/lib/seeded-random";

export const metadata: Metadata = { title: "Detail Pesanan Penginapan" };

type PageProps = { params: Promise<{ id: string }> };

export default function AccommodationBookingDetailPage({ params }: PageProps) {
  return (
    <div className="space-y-5">
      <Link
        href="/akun/pesanan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Semua pesanan
      </Link>

      <Suspense fallback={<DetailSkeleton />}>
        <BookingDetail params={params} />
      </Suspense>
    </div>
  );
}

async function BookingDetail({ params }: PageProps) {
  const { id } = await params;
  const token = await requireAccessToken();

  let booking: AccommodationBooking | null;
  try {
    booking = await getAccommodationBooking(id, { token });
  } catch {
    return (
      <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Detail pesanan belum bisa dimuat. Coba muat ulang halaman ini nanti.
      </p>
    );
  }

  if (!booking) notFound();

  const rooms = booking.accommodation_booking_rooms ?? [];
  const closed = isClosed(booking.payment_status);
  const invoiceLive =
    booking.payment_status === "pending" &&
    booking.invoice_url !== null &&
    !isExpired(booking.invoice_expires_at);

  return (
    <AccountSection
      title={booking.booking_code}
      description={`Dipesan ${formatDateTime(booking.created_at)}.`}
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
              <Row label="Dibayar" value={formatDateTime(booking.paid_at)} />
            )}
            {booking.payment_method && (
              <Row label="Metode" value={booking.payment_method} />
            )}
            {booking.invoice_expires_at && booking.payment_status !== "paid" && (
              <Row
                label={closed ? "Batas pembayaran berakhir" : "Batas pembayaran"}
                value={formatDateTime(booking.invoice_expires_at)}
              />
            )}
          </dl>

          {closed && <ClosedNotice status={booking.payment_status} />}

          {booking.payment_status === "pending" && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <AccommodationBookingActions bookingId={booking.id} />
              {invoiceLive && booking.invoice_url && (
                 <a
                  href={booking.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 underline underline-offset-2"
                >
                  Buka tagihan yang sudah dibuat
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Rincian kamar untuk pesanan ini tidak tersedia.
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

const CLOSED_COPY: Partial<Record<PaymentStatus, { title: string; body: string }>> = {
  failed: {
    title: "Pembayaran tidak selesai",
    body: "Batas waktu pembayaran sudah lewat, jadi tagihannya ditutup dan kamar yang ditahan dilepas kembali. Tidak ada yang perlu Anda bayar untuk pesanan ini.",
  },
  expired: {
    title: "Tagihan sudah kedaluwarsa",
    body: "Tagihan pesanan ini melewati batas waktunya sebelum dibayar, sehingga kamarnya dilepas kembali. Tidak ada yang perlu Anda bayar untuk pesanan ini.",
  },
  cancelled: {
    title: "Pesanan dibatalkan",
    body: "Pesanan ini dibatalkan dan kamarnya sudah dilepas kembali. Tidak ada yang perlu Anda bayar untuk pesanan ini.",
  },
};

function ClosedNotice({ status }: { status: PaymentStatus }) {
  const copy = CLOSED_COPY[status];
  if (!copy) return null;

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
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
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

function RoomCard({ room, closed }: { room: AccommodationBookingRoom; closed: boolean }) {
  const acc = room.accommodations;

  return (
    <div
      className={
        closed
          ? "rounded-2xl border border-dashed border-border bg-muted/40 p-5"
          : "rounded-2xl border border-border bg-card p-5"
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
        >
          <BedDouble className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{acc?.name ?? room.room_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {room.room_name} · {room.guests} tamu · {room.nights} malam
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
        <Row label="Check-in" value={room.check_in} />
        <Row label="Check-out" value={room.check_out} />
        <Row
          label="Subtotal"
          value={
            closed
              ? `${formatIDR(room.subtotal)} (tidak berlaku)`
              : formatIDR(room.subtotal)
          }
        />
      </dl>
    </div>
  );
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt.endsWith("Z") ? expiresAt : `${expiresAt}Z`);
  return Number.isNaN(parsed) || parsed <= Date.now();
}

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