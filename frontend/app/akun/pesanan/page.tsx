import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BedDouble, ChevronRight, Plane, Ticket } from "lucide-react";
import { AccountSection } from "@/components/account/account-section";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import {
  listAccommodationBookings,
  listFlightBookings,
  type AccommodationBookingSummary,
  type FlightBookingSummary,
  type PaymentStatus,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { formatDateTime } from "@/lib/format-date";
import { formatIDR } from "@/lib/seeded-random";
import { formatDateLabel } from "@/lib/stays-search";

export const metadata: Metadata = { title: "Pesanan Saya" };

export default function AccountBookingsPage() {
  return (
    <AccountSection
      title="Pesanan saya"
      description="Tiket pesawat dan penginapan yang Anda pesan, beserta status pembayarannya."
    >
      <Suspense fallback={<ListSkeleton />}>
        <BookingList />
      </Suspense>
    </AccountSection>
  );
}

/**
 * The two booking kinds live in separate tables and separate endpoints, so
 * they are fetched side by side and merged into one list here — the reader
 * thinks in terms of "my orders", not in terms of which table holds them.
 */
type Entry = {
  id: string;
  kind: "flight" | "stay";
  href: string;
  code: string;
  total: number;
  status: PaymentStatus;
  createdAt: string;
  /** What was booked, when the row can say — the property, for a stay. */
  detail: string | null;
};

function fromFlight(booking: FlightBookingSummary): Entry {
  return {
    id: booking.id,
    kind: "flight",
    href: `/akun/pesanan/${booking.id}`,
    code: booking.booking_code,
    total: booking.total_price,
    status: booking.payment_status,
    createdAt: booking.created_at,
    detail: null,
  };
}

function fromStay(booking: AccommodationBookingSummary): Entry {
  const rooms = booking.accommodation_booking_rooms ?? [];
  const first = rooms[0];
  const name = first?.accommodations?.name;

  // Every room in a booking is at the same property, so the name is stated
  // once and the room count carries the rest.
  const detail = name
    ? [
        name,
        rooms.length > 1 ? `${rooms.length} kamar` : null,
        first ? `${formatDateLabel(first.check_in)} · ${first.nights} malam` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return {
    id: booking.id,
    kind: "stay",
    href: `/akun/pesanan/penginapan/${booking.id}`,
    code: booking.booking_code,
    total: booking.total_price,
    status: booking.payment_status,
    createdAt: booking.created_at,
    detail,
  };
}

async function BookingList() {
  const token = await requireAccessToken();

  // One dead endpoint should not blank out the other kind's orders, so each
  // side degrades on its own and the page only gives up when both fail.
  const [flights, stays] = await Promise.all([
    listFlightBookings({ token }).then(
      (data) => data.map(fromFlight),
      () => null,
    ),
    listAccommodationBookings({ token }).then(
      (data) => data.map(fromStay),
      () => null,
    ),
  ]);

  if (flights === null && stays === null) {
    return (
      <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Daftar pesanan belum bisa dimuat. Coba muat ulang halaman ini nanti.
      </p>
    );
  }

  const entries = [...(flights ?? []), ...(stays ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  if (entries.length === 0) return <Empty />;

  return (
    <div className="space-y-3">
      {(flights === null || stays === null) && (
        <p className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          {flights === null
            ? "Pesanan tiket pesawat belum bisa dimuat, jadi daftar ini mungkin belum lengkap."
            : "Pesanan penginapan belum bisa dimuat, jadi daftar ini mungkin belum lengkap."}
        </p>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={`${entry.kind}-${entry.id}`}>
            <Link
              href={entry.href}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-brand-700/40"
            >
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
              >
                {entry.kind === "stay" ? (
                  <BedDouble className="h-5 w-5" />
                ) : (
                  <Plane className="h-5 w-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold">
                  {entry.code}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {entry.detail ??
                    (entry.kind === "stay" ? "Penginapan" : "Tiket pesawat")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dipesan {formatDateTime(entry.createdAt)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={
                    isClosed(entry.status)
                      ? "text-sm font-bold tabular-nums text-muted-foreground line-through decoration-1"
                      : "text-sm font-bold tabular-nums"
                  }
                >
                  {formatIDR(entry.total)}
                </p>
                <BookingStatus status={entry.status} className="mt-1" />
              </div>

              <ChevronRight
                aria-hidden="true"
                className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
      >
        <Ticket className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
        Belum ada pesanan
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Tiket dan penginapan yang Anda pesan akan muncul di sini, lengkap
        dengan status pembayarannya.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/flights"
          className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          Cari penerbangan
        </Link>
        <Link
          href="/hotels"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:border-brand-700 hover:bg-brand-tint/10"
        >
          Cari penginapan
        </Link>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-[4.75rem] animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
