import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BedDouble,
  Building2,
  Handshake,
  MapPinned,
  MessagesSquare,
} from "lucide-react";
import {
  getAccommodation,
  getAccommodationReviews,
  type Accommodation,
  type AccommodationReview,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { coverImage } from "@/lib/home-data";
import { parseStaySearch, tierLabel } from "@/lib/stays-search";
import type { RawSearchParams } from "@/lib/stays-search";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { LoadError } from "@/components/home/load-error";
import { Rating } from "@/components/home/rating";
import { Breadcrumb } from "@/components/destination/breadcrumb";
import { ReviewForm } from "@/components/destination/review-form";
import { ReviewSummary } from "@/components/destination/review-summary";
import { LocationCard } from "@/components/peta/location-card";
import { AvailabilityCard } from "@/components/stays/availability-card";
import { NearbyDestinations } from "@/components/stays/nearby-destinations";
import { StayReviewList } from "@/components/stays/stay-review-list";
import { removeStayReview, submitStayReview } from "@/app/hotels/[id]/actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  let stay: Accommodation | null;
  try {
    stay = await getAccommodation((await params).id);
  } catch {
    stay = null;
  }
  if (!stay) return { title: "Penginapan tidak ditemukan" };

  const place = placeOf(stay);
  const description = `${tierLabel(stay.tier)} di ${place || "Indonesia"}. Lihat tarif per malam, kapasitas kamar, dan ketersediaan untuk tanggal menginap Anda.`;

  return {
    title: stay.name,
    description,
    openGraph: {
      title: stay.name,
      description,
      type: "article",
      images: stay.cover_image_url ? [{ url: stay.cover_image_url }] : undefined,
    },
  };
}

function placeOf(stay: Accommodation): string {
  return [stay.cities?.name, stay.cities?.provinces?.name]
    .filter(Boolean)
    .join(", ");
}

export default function StayPage({ params, searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* params and searchParams are both dynamic, so the whole page streams
            in behind one boundary while the shell stays static. */}
        <Suspense fallback={<StaySkeleton />}>
          <StayDetail params={params} searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function StayDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  // The dates, guests, and rooms ride along from the listing, so the
  // availability check answers for the stay the reader was actually planning.
  const state = parseStaySearch(await searchParams);

  let stay: Accommodation | null;
  try {
    stay = await getAccommodation(id);
  } catch {
    // An unreachable API is not a missing property, but there is nothing to
    // render either way.
    stay = null;
  }
  if (!stay) notFound();

  const place = placeOf(stay);
  // Seeded rows report an unreviewed property as 0 rather than null, and
  // "0,0" reads as a bad score instead of a missing one.
  const rating =
    stay.avg_rating !== null && stay.avg_rating > 0 ? stay.avg_rating : null;

  return (
    <div className="container-page pt-5">
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/" },
          { label: "Hotel", href: "/hotels" },
          ...(stay.cities
            ? [
                {
                  label: stay.cities.name,
                  href: `/hotels?city=${stay.cities.id}`,
                },
              ]
            : []),
          { label: stay.name },
        ]}
      />

      <div className="mt-3">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {stay.name}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {rating === null ? (
            <span>Belum ada ulasan</span>
          ) : (
            <Rating value={rating} reviews={stay.review_count} className="text-sm" />
          )}
          {place && <span>{place}</span>}
          <span className="rounded-full bg-brand-tint/10 px-2.5 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-700/40 dark:text-brand-50">
            {tierLabel(stay.tier)}
          </span>
        </div>
      </div>

      <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-brand-700 sm:aspect-[21/9]">
        <Image
          src={coverImage(stay, 1400, 600)}
          alt={stay.name}
          fill
          priority
          sizes="(min-width: 1280px) 72rem, 100vw"
          className="object-cover"
        />
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-10">
          <Facts stay={stay} />

          <LocationCard place={stay} placeLabel={place} />

          <Suspense fallback={<ReviewsFallback />}>
            <StayReviewsSection
              accommodationId={stay.id}
              average={rating}
            />
          </Suspense>
        </div>

        <aside className="lg:sticky lg:top-24">
          <AvailabilityCard stay={stay} state={state} />
          <p className="mt-3 px-1 text-[11px] leading-snug text-muted-foreground">
            Ketersediaan dihitung dari pemesanan yang sudah tercatat pada
            rentang tanggal ini, bukan dari sistem mitra.
          </p>
        </aside>
      </div>

      <Suspense fallback={null}>
        <NearbyDestinations stay={stay} />
      </Suspense>
    </div>
  );
}

/** Quick-facts strip under the cover, the way a listing opens a property. */
function Facts({ stay }: { stay: Accommodation }) {
  const facts = [
    { icon: Building2, label: "Kelas", value: tierLabel(stay.tier) },
    {
      icon: BedDouble,
      label: "Kapasitas",
      value:
        stay.max_guests !== null
          ? `${stay.max_guests} tamu per kamar`
          : "Tidak dicatat",
    },
    {
      icon: MapPinned,
      label: "Kota",
      value: stay.cities?.name ?? "—",
    },
    {
      icon: Handshake,
      label: "Mitra",
      value: stay.partner_name ?? "—",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="truncate text-sm font-semibold">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * Reviews block: the score breakdown, the write form, then the list.
 *
 * Reads the session cookie, so it is always dynamic — kept behind its own
 * Suspense boundary rather than holding the whole page back.
 */
async function StayReviewsSection({
  accommodationId,
  average,
}: {
  accommodationId: string;
  /** Already normalised: 0 arrives as null, so the summary shows "—". */
  average: number | null;
}) {
  const token = await getAccessToken();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const currentUserId = (claims?.claims?.sub as string | undefined) ?? null;

  let reviews: AccommodationReview[] | null = null;
  try {
    reviews = await getAccommodationReviews(accommodationId, { token });
  } catch {
    reviews = null;
  }

  return (
    <section id="ulasan" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <MessagesSquare className="h-5 w-5 text-brand-700 dark:text-brand-100" />
        Ulasan tamu
      </h2>

      {reviews === null ? (
        <div className="mt-3">
          <LoadError what="Ulasan" />
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <ReviewSummary reviews={reviews} average={average} />

          <ReviewForm
            signedIn={token !== null}
            action={submitStayReview.bind(null, accommodationId)}
          />

          <StayReviewList
            reviews={reviews}
            currentUserId={currentUserId}
            onDelete={removeStayReview.bind(null, accommodationId)}
          />
        </div>
      )}
    </section>
  );
}

function ReviewsFallback() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function StaySkeleton() {
  return (
    <div className="container-page pt-5">
      <div className="h-3 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3.5 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-4 aspect-[16/9] animate-pulse rounded-2xl bg-muted sm:aspect-[21/9]" />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
