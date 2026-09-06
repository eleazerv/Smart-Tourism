"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import { listTripBookings, type TripBookingSummary } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { formatDateTime } from "@/lib/format-date";
import { formatIDR } from "@/lib/seeded-random";

export function TripBookingList() {
  const [bookings, setBookings] = useState<TripBookingSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getBrowserAccessToken();
      if (!token) return;
      try {
        setBookings(await listTripBookings({ token }));
      } catch {
        setError(true);
      }
    })();
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        Daftar pesanan belum bisa dimuat. Coba muat ulang halaman ini nanti.
      </p>
    );
  }

  if (bookings === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-[4.75rem] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
        >
          <Package className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
          Belum ada paket trip
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Rencana yang di-checkout lewat asisten AI akan muncul di sini,
          lengkap dengan penerbangan dan penginapannya.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          Buat rencana
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`/akun/pesanan/trip/${booking.id}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-brand-700/40"
          >
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
            >
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-semibold">
                {booking.booking_code}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dipesan {formatDateTime(booking.created_at)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={
                  isClosed(booking.payment_status)
                    ? "text-sm font-bold tabular-nums text-muted-foreground line-through decoration-1"
                    : "text-sm font-bold tabular-nums"
                }
              >
                {formatIDR(booking.total_price)}
              </p>
              <BookingStatus status={booking.payment_status} className="mt-1" />
            </div>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}