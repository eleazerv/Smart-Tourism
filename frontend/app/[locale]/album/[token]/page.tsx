import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Compass, Images } from "lucide-react";
import {
  getSharedAlbum,
  type AlbumDestination,
  type SavedDestination,
} from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { SavedGrid } from "@/components/account/saved-grid";
import { getTranslations } from "next-intl/server";

type PageProps = { params: Promise<{ token: string; locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sharedAlbum" });
  return {
  title: t("metaTitle"),
  // A share link is meant for the people it was sent to, not for search
  // results. The token is unguessable, but indexing would undo that.
  robots: { index: false, follow: false },
  };
}

/** The public view has no bookmark state of its own to carry. */
function asSaved(rows: AlbumDestination[]): SavedDestination[] {
  return rows.map((row) => ({
    ...row,
    saved_id: row.id,
    saved_at: row.added_at,
    albums: [],
  }));
}

async function SharedAlbum({ params }: PageProps) {
  const { token } = await params;

  let album;
  try {
    album = await getSharedAlbum(token);
  } catch {
    album = null;
  }

  const t = await getTranslations("sharedAlbum");
  // A revoked link and a made-up one look identical on purpose: neither
  // should reveal that an album was ever there.
  if (!album) notFound();

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Images aria-hidden="true" className="h-4 w-4" />
        {t("heading")}
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {album.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("count", { count: album.item_count })}
      </p>

      <div className="mt-6">
        {album.destinations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <SavedGrid saved={asSaved(album.destinations)} owned={false} />
        )}
      </div>

      <div className="mt-10 flex flex-col gap-2 rounded-2xl bg-brand-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base font-bold">
            {t("ctaTitle")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">
            {t("cta")}
          </p>
        </div>
        <Link
          href="/destinations"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition hover:bg-brand-100"
        >
          <Compass className="h-4 w-4" />
          Mulai jelajah
        </Link>
      </div>
    </div>
  );
}

export default function SharedAlbumPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<Skeleton />}>
          <SharedAlbum params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
