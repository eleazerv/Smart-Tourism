import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarDays, LogIn, MapPinned } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { Breadcrumb } from "@/components/destination/breadcrumb";
import { StayBookingForm } from "@/components/stays/stay-booking-form";
import {
  getAccommodation,
  getAccommodationAvailability,
  getProfile,
  type Accommodation,
  type AccommodationAvailability,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { coverImage } from "@/lib/home-data";
import { formatIDR } from "@/lib/seeded-random";
import { nightsBetween, todayISO } from "@/lib/calendar";
import {
  formatDateLabel,
  hasStayDates,
  parseStaySearch,
  stayBookingHref,
  stayHref,
  tierLabel,
  type RawSearchParams,
} from "@/lib/stays-search";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
};

export const metadata: Metadata = {
  title: "Detail Pemesanan",
  description:
    "Periksa kamar, tanggal, dan total biaya sebelum melanjutkan ke pembayaran.",
  // A half-finished booking is not something search engines should surface.
  robots: { index: false, follow: false },
};

export default function StayBookingPage({ params, searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<BookingSkeleton />}>
          <StayBooking params={params} searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function StayBooking({ params, searchParams }: PageProps) {
  const { id } = await params;
  // The dates and party size ride along from the listing, so the checkout
  // prices the stay the reader was actually planning.
  const state = parseStaySearch(await searchParams);

  let stay: Accommodation | null;
  try {
    stay = await getAccommodation(id);
  } catch {
    // An unreachable API and a removed property look the same here.
    stay = null;
  }
  if (!stay) return <Missing />;

  // Nothing here can be priced, checked, or invoiced without the nights. The
  // detail page's CTA only appears once they are set, so arriving undated
  // means a hand-typed or long-stale link — say so rather than redirecting.
  if (!hasStayDates(state)) {
    return <NeedDates stayId={stay.id} name={stay.name} />;
  }

  const token = await getAccessToken();

  // Availability and the reader's own contact details are both nice-to-have:
  // the create call re-checks rooms server-side and is the real authority, so
  // neither is worth failing the checkout over.
  const [availability, profile] = await Promise.all([
    getAccommodationAvailability(stay.id, {
      check_in: state.checkIn,
      check_out: state.checkOut,
    }).catch(() => null as AccommodationAvailability | null),
    token ? getProfile({ token }).catch(() => null) : Promise.resolve(null),
  ]);

  const nights = nightsBetween(state.checkIn, state.checkOut);
  const place = [stay.cities?.name, stay.cities?.provinces?.name]
    .filter(Boolean)
    .join(", ");
  const backHref = stayHref(state, stay.id);

  return (
    <div className="container-page py-6">
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/" },
          { label: "Hotel", href: "/hotels" },
          { label: stay.name, href: backHref },
          { label: "Pemesanan" },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Lengkapi pemesanan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stay.name}
            {place && ` · ${place}`}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke penginapan
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <PropertyCard
            stay={stay}
            place={place}
            checkIn={state.checkIn}
            checkOut={state.checkOut}
            nights={nights}
          />

          {token ? (
            <StayBookingForm
              stay={{
                id: stay.id,
                name: stay.name,
                pricePerNight: stay.price_per_night,
                maxGuests: stay.max_guests,
                checkIn: state.checkIn,
                checkOut: state.checkOut,
                nights,
                available: availability?.available ?? null,
              }}
              initialRooms={state.rooms ?? 1}
              initialGuests={state.guests ?? 1}
              today={todayISO()}
              contactName={profile?.full_name?.trim() ?? ""}
              contactEmail={profile?.email ?? ""}
            />
          ) : (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
              <h2 className="font-display text-base font-bold tracking-tight">
                Pemesan
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Masuk dulu untuk menahan kamar dan melanjutkan ke pembayaran.
              </p>
              <div className="mt-4">
                <SignInFirst
                  nextHref={stayBookingHref(state, stay.id)}
                />
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
              <li>{availabilityNote(availability?.available ?? null)}</li>
              <li>Satu pesanan menampung maksimal 5 kamar.</li>
              {stay.max_guests !== null && (
                <li>Kapasitas satu kamar {stay.max_guests} tamu.</li>
              )}
              <li>Kamar ditahan begitu pesanan dibuat, sebelum dibayar.</li>
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

/** The property being booked, so the reader can confirm it at a glance. */
function PropertyCard({
  stay,
  place,
  checkIn,
  checkOut,
  nights,
}: {
  stay: Accommodation;
  place: string;
  checkIn: string;
  checkOut: string;
  nights: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-32">
          <Image
            src={coverImage(stay, 256, 192)}
            alt=""
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-700">
            {tierLabel(stay.tier)}
          </p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            {stay.name}
          </h2>
          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPinned aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {place}
            </p>
          )}
          {stay.partner_name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dikelola {stay.partner_name}
            </p>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-lg font-bold tabular-nums">
            {formatIDR(stay.price_per_night)}
          </p>
          <p className="text-xs text-muted-foreground">per malam</p>
        </div>
      </div>

      <dl className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
        <div className="flex items-start gap-2.5 bg-card px-4 py-3 sm:px-5">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Tanggal menginap</dt>
            <dd className="text-sm font-medium">
              {formatDateLabel(checkIn)} – {formatDateLabel(checkOut)}{" "}
              <span className="text-muted-foreground">({nights} malam)</span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-card px-4 py-3 sm:px-5">
          <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Kapasitas kamar</dt>
            <dd className="text-sm font-medium">
              {stay.max_guests === null
                ? "Tidak dicantumkan"
                : `${stay.max_guests} tamu per kamar`}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
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
        Pemesanan tercatat pada akun Anda, jadi konfirmasi dan status
        pembayarannya bisa dibuka kembali kapan saja.
      </p>
    </div>
  );
}

/**
 * The room situation in one line. The total room count stays out of it — how
 * small the property is has no bearing on whether this booking can proceed,
 * and only the last few rooms are worth naming a number for.
 */
function availabilityNote(available: number | null): string {
  if (available === null) {
    return "Ketersediaan kamar belum bisa dicek untuk tanggal ini.";
  }
  if (available === 0) return "Kamar penuh untuk tanggal ini.";
  if (available <= 3) return `Tersisa ${available} kamar untuk tanggal ini.`;
  return "Kamar tersedia untuk tanggal ini.";
}

/** Reached when the checkout is opened without the stay having been dated. */
function NeedDates({ stayId, name }: { stayId: string; name: string }) {
  return (
    <div className="container-page py-20 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
      >
        <CalendarDays className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
        Pilih tanggal menginap dulu
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Total biaya dan ketersediaan kamar di {name} baru bisa dihitung setelah
        tanggal check-in dan check-out ditentukan.
      </p>
      <Link
        href={`/hotels/${stayId}`}
        className="mt-6 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
      >
        Pilih tanggal
      </Link>
    </div>
  );
}

/**
 * Reached when the link no longer resolves to a property — a hand-edited id,
 * or a bookmark whose listing has since been removed.
 */
function Missing() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Penginapan tidak ditemukan
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Penginapan untuk tautan ini sudah tidak tersedia. Silakan cari ulang
        penginapan Anda.
      </p>
      <Link
        href="/hotels"
        className="mt-6 inline-block rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
      >
        Cari penginapan
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
