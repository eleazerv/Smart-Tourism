import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, Plane } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Breadcrumb } from "@/components/destination/breadcrumb";
import { BookingForm } from "@/components/flights/booking-form";
import {
  airportByCityId,
  clockOf,
  dateOf,
  durationMinutes,
  formatDuration,
  arrivalDayOffset,
} from "@/lib/airports";
import { getFlight, getProfile, getTakenSeats, type FlightDetail } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { formatDateLabel, type RawSearchParams } from "@/lib/flights-search";

type PageProps = { searchParams: Promise<RawSearchParams> };

export const metadata: Metadata = {
  title: "Detail Pemesanan",
  description:
    "Periksa jadwal dan harga penerbangan sebelum melanjutkan ke pembayaran.",
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
  const flightId = (
    Array.isArray(params.flight) ? params.flight[0] : (params.flight ?? "")
  ).trim();

  if (!flightId) return <Missing />;

  let flight: FlightDetail | null = null;
  try {
    flight = await getFlight(flightId);
  } catch {
    // A dead API and a deleted flight look the same to the reader here.
    return <Missing />;
  }
  if (!flight) return <Missing />;

  const token = await getAccessToken();

  // The seat map and the reader's own name are both nice-to-have: neither is
  // worth failing the booking page over, so both degrade quietly.
  const [takenSeats, profileName] = await Promise.all([
    getTakenSeats(flight.id).catch(() => [] as string[]),
    token
      ? getProfile({ token })
          .then((profile) => profile?.full_name?.trim() ?? "")
          .catch(() => "")
      : Promise.resolve(""),
  ]);

  const from = flight.origin ? airportByCityId(flight.origin.id) : null;
  const to = flight.destination ? airportByCityId(flight.destination.id) : null;
  const fromLabel = from?.code ?? flight.origin?.name ?? "Asal";
  const toLabel = to?.code ?? flight.destination?.name ?? "Tujuan";

  const date = dateOf(flight.departure_time);
  const backHref =
    from?.code && to?.code
      ? `/flights?from=${from.code}&to=${to.code}&date=${date}`
      : "/flights";
  const bookHref = `/flights/pesan?flight=${encodeURIComponent(flight.id)}`;

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/" },
          { label: "Tiket Pesawat", href: "/flights" },
          { label: `${fromLabel} – ${toLabel}`, href: backHref },
          { label: "Pemesanan" },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Lengkapi pemesanan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {flight.origin?.name ?? fromLabel} ke{" "}
            {flight.destination?.name ?? toLabel} &middot;{" "}
            {formatDateLabel(date)}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Ganti penerbangan
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <ItineraryCard
            flight={flight}
            fromLabel={fromLabel}
            toLabel={toLabel}
          />

          {token ? (
            <BookingForm
              flight={{
                id: flight.id,
                airline: flight.airline,
                flightNumber: flight.flight_number,
                departureTime: flight.departure_time,
                arrivalTime: flight.arrival_time,
                durationMin: durationMinutes(flight),
                fromLabel,
                toLabel,
                dateLabel: formatDateLabel(date),
                price: flight.price,
                seatsLeft: flight.available_seats,
              }}
              takenSeats={takenSeats}
              defaultName={profileName}
            />
          ) : (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
              <h2 className="font-display text-base font-bold tracking-tight">
                Penumpang
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Masuk dulu untuk mengisi nama penumpang dan memilih kursi.
              </p>
              <div className="mt-4">
                <SignInFirst nextHref={bookHref} />
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-base font-bold tracking-tight">
              Ketentuan
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Sisa kursi saat ini: {flight.available_seats}.</li>
              <li>Satu tiket diterbitkan untuk setiap nama penumpang.</li>
              <li>Pembayaran diproses oleh Xendit di halaman terpisah.</li>
              <li>
                Pesanan yang belum dibayar dapat dibatalkan dari halaman
                pesanan.
              </li>
            </ul>
            <Link
              href="/akun/pesanan"
              className="mt-3 inline-block text-xs font-semibold text-brand-700 underline underline-offset-2"
            >
              Lihat Pesanan saya
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ItineraryCard({
  flight,
  fromLabel,
  toLabel,
}: {
  flight: FlightDetail;
  fromLabel: string;
  toLabel: string;
}) {
  const from = flight.origin ? airportByCityId(flight.origin.id) : null;
  const to = flight.destination ? airportByCityId(flight.destination.id) : null;
  const dayOffset = arrivalDayOffset(flight);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold tracking-tight">
          Penerbangan berangkat
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatDateLabel(dateOf(flight.departure_time))}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold">{flight.airline}</p>
        <p className="text-xs text-muted-foreground">{flight.flight_number}</p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-xl font-bold leading-none tabular-nums">
            {clockOf(flight.departure_time)}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {fromLabel}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-center text-[11px] text-muted-foreground">
            {formatDuration(durationMinutes(flight))}
          </p>
          <div className="relative my-1 h-px bg-border">
            <Plane
              aria-hidden="true"
              className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-muted-foreground"
            />
          </div>
          <p className="text-center text-[11px] font-medium text-emerald-700">
            Langsung
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-bold leading-none tabular-nums">
            {clockOf(flight.arrival_time)}
            {dayOffset > 0 && (
              <sup className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                +{dayOffset}
              </sup>
            )}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {toLabel}
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {placeLabel(from?.name, flight.origin?.name ?? fromLabel, flight.origin?.provinces?.name)}{" "}
        &rarr;{" "}
        {placeLabel(to?.name, flight.destination?.name ?? toLabel, flight.destination?.provinces?.name)}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Jam yang tertera mengikuti jadwal yang diterbitkan maskapai.
      </p>
    </section>
  );
}

/** "Soekarno-Hatta, Jakarta, DKI Jakarta" out of whichever parts exist. */
function placeLabel(
  airportName: string | undefined,
  city: string,
  province: string | undefined,
): string {
  return [airportName, city, province].filter(Boolean).join(", ");
}

function SignInFirst({ nextHref }: { nextHref: string }) {
  return (
    <div className="space-y-3">
      <Link
        href={`/auth/login?next=${encodeURIComponent(nextHref)}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900"
      >
        <LogIn className="h-4 w-4" />
        Masuk untuk memesan
      </Link>
      <p className="text-xs leading-snug text-muted-foreground">
        Pemesanan tercatat pada akun Anda, jadi tiket dan status pembayarannya
        bisa dibuka kembali kapan saja.
      </p>
    </div>
  );
}

/**
 * Reached when the link no longer resolves to a flight — a hand-edited id, or
 * a bookmark whose schedule has since been removed.
 */
function Missing() {
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
        className="mt-6 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
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
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
