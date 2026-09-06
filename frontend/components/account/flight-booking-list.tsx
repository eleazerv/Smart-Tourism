"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Ticket } from "lucide-react";
import { BookingStatus, isClosed } from "@/components/account/booking-status";
import { listFlightBookings, type FlightBookingSummary } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { formatDateTime } from "@/lib/format-date";
import { formatIDR } from "@/lib/seeded-random";
import { useLocale, useTranslations } from "next-intl";

export function FlightBookingList() {
  const t = useTranslations("bookings");
  const locale = useLocale();

  const [bookings, setBookings] = useState<FlightBookingSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getBrowserAccessToken();
      if (!token) return;
      try {
        setBookings(await listFlightBookings({ token }));
      } catch {
        setError(true);
      }
    })();
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        {t("loadError")}
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
          <Ticket className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
          {t("emptyFlights")}
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          {t("emptyFlightsBody")}
        </p>
        <Link
          href="/flights"
          className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          {t("findFlight")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`/akun/pesanan/flight/${booking.id}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-brand-700/40"
          >
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
            >
              <Ticket className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-semibold">
                {booking.booking_code}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("bookedAt", {
                  date: formatDateTime(booking.created_at, locale),
                })}
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