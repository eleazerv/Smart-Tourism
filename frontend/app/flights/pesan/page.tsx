import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Plane } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { SampleDataNotice } from "@/components/catalogue/search-hero";
import { Breadcrumb } from "@/components/destination/breadcrumb";
import { BookingForm } from "@/components/flights/booking-form";
import {
  airport,
  arrivalDayOffset,
  arrivalMinutes,
  fareBreakdown,
  flightsFor,
  formatClock,
  formatDuration,
  type Flight,
} from "@/lib/flight-data";
import { formatIDR } from "@/lib/seeded-random";
import {
  formatDateLabel,
  parseFlightSearch,
  type RawSearchParams,
} from "@/lib/flights-search";

type PageProps = { searchParams: Promise<RawSearchParams> };

export const metadata: Metadata = {
  title: "Detail Pemesanan",
  description:
    "Periksa jadwal, rincian harga, dan data penumpang sebelum melanjutkan pemesanan tiket pesawat.",
  // A half-finished booking is not something search engines should surface.
  robots: { index: false, follow: false },
};

export default function BookingPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<BookingSkeleton />}>
          <Booking searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Booking({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = parseFlightSearch(params);

  const flightId = Array.isArray(params.flight)
    ? params.flight[0]
    : (params.flight ?? "");

  // The schedule is regenerated from the same seed the search used, so the
  // flight is found by id rather than carried across in a session.
  const flight =
    flightsFor(state.from, state.to, state.date, state.cabin).find(
      (entry) => entry.id === flightId,
    ) ?? null;

  const from = airport(state.from);
  const to = airport(state.to);

  if (!flight || !from || !to) return <Expired />;

  const fare = fareBreakdown(flight.price, state.passengers);
  const backHref = `/flights?from=${state.from}&to=${state.to}&date=${state.date}&cabin=${state.cabin}&pax=${state.passengers}`;

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/" },
          { label: "Tiket Pesawat", href: "/flights" },
          { label: `${from.code} – ${to.code}`, href: backHref },
          { label: "Pemesanan" },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Lengkapi pemesanan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {from.city} ke {to.city} &middot; {formatDateLabel(state.date)}{" "}
            &middot; {state.passengers} penumpang
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Ganti penerbangan
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <SampleDataNotice what="Jadwal dan harga" />
          <ItineraryCard flight={flight} date={state.date} cabin={state.cabin} />
          <BookingForm
            passengers={state.passengers}
            total={fare.total}
            route={`${from.code} – ${to.code}`}
            exploreHref={`/destinations?q=${encodeURIComponent(to.city)}`}
            exploreLabel={`Jelajahi ${to.city}`}
          />
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-base font-bold tracking-tight">
              Rincian harga
            </h2>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  Tarif penumpang ({state.passengers}x)
                </dt>
                <dd className="tabular-nums">{formatIDR(fare.base)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pajak &amp; biaya layanan</dt>
                <dd className="tabular-nums">{formatIDR(fare.tax)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatIDR(fare.total)}</dd>
              </div>
            </dl>

            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Harga sudah termasuk pajak dan biaya layanan. Tidak ada biaya
              tambahan di langkah berikutnya.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-base font-bold tracking-tight">
              Ketentuan
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>
                Bagasi:{" "}
                {flight.baggageKg > 0
                  ? `${flight.baggageKg} kg tercatat + 7 kg kabin`
                  : "7 kg kabin saja"}
              </li>
              <li>Check-in bandara ditutup 45 menit sebelum keberangkatan.</li>
              <li>Nama penumpang tidak dapat diubah setelah diterbitkan.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ItineraryCard({
  flight,
  date,
  cabin,
}: {
  flight: Flight;
  date: string;
  cabin: string;
}) {
  const from = airport(flight.from);
  const to = airport(flight.to);
  const dayOffset = arrivalDayOffset(flight);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold tracking-tight">
          Penerbangan berangkat
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatDateLabel(date)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-900 dark:bg-brand-700/50 dark:text-brand-50"
        >
          {flight.airlineCode}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{flight.airlineName}</p>
          <p className="text-xs text-muted-foreground">
            {flight.flightNo} &middot; {flight.aircraft} &middot; kelas {cabin}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-xl font-bold leading-none tabular-nums">
            {formatClock(flight.departMinutes)}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {flight.from}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-center text-[11px] text-muted-foreground">
            {formatDuration(flight.durationMin)}
          </p>
          <div className="relative my-1 h-px bg-border">
            <Plane
              aria-hidden="true"
              className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
            />
          </div>
          <p className="text-center text-[11px] font-medium">
            {flight.stops === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Langsung
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">
                1 transit &middot; {flight.via}
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-bold leading-none tabular-nums">
            {formatClock(arrivalMinutes(flight))}
            {dayOffset > 0 && (
              <sup className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                +{dayOffset}
              </sup>
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {flight.to}
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {from?.name}, {from?.city} &rarr; {to?.name}, {to?.city}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5 shrink-0" />
        {flight.baggageKg > 0
          ? `Bagasi ${flight.baggageKg} kg termasuk`
          : "Hanya bagasi kabin"}
      </p>
    </section>
  );
}

/**
 * Reached when the link no longer resolves to a flight — a hand-edited id, or
 * a bookmark from a search whose date has rolled past.
 */
function Expired() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Penerbangan tidak ditemukan
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Jadwal untuk tautan ini sudah tidak tersedia. Silakan cari ulang
        penerbangan Anda.
      </p>
      <Link
        href="/flights"
        className="mt-6 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        Cari penerbangan
      </Link>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
