import type { Metadata } from "next";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Compass, Share2 } from "lucide-react";
import {
  getAlbum,
  listSavedDestinations,
  type AlbumDestination,
  type SavedDestination,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { LOOSE_SLUG } from "@/components/account/album-routes";
import { SavedGrid } from "@/components/account/saved-grid";
import { LoadError } from "@/components/home/load-error";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "albums" });
  return { title: t("albumMetaTitle") };
}

type PageProps = { params: Promise<{ id: string; locale: string }> };

/**
 * `AlbumDestination` and `SavedDestination` differ only in the timestamp each
 * carries, so the grid takes the shape it already knows.
 */
function asSaved(rows: AlbumDestination[]): SavedDestination[] {
  return rows.map((row) => ({
    ...row,
    saved_id: row.id,
    saved_at: row.added_at,
    albums: [],
  }));
}

async function AlbumDetail({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("albums");
  const token = await requireAccessToken();

  // The loose bucket is not an album row, so it never reaches the API.
  if (id === LOOSE_SLUG) {
    let saved: SavedDestination[];
    try {
      saved = await listSavedDestinations({ token });
    } catch {
      return <LoadError what={t("savedLoadErrorWhat")} />;
    }

    const loose = saved.filter((row) => row.albums.length === 0);

    return (
      <Shell name={t("looseAlbum")} count={loose.length}>
        <p className="text-sm text-muted-foreground">
          {t("looseBlurb")}
        </p>
        <div className="mt-4">
          {loose.length === 0 ? <Empty /> : <SavedGrid saved={loose} />}
        </div>
      </Shell>
    );
  }

  let album;
  try {
    album = await getAlbum(id, { token });
  } catch {
    return <LoadError what={t("albumLoadErrorWhat")} />;
  }
  if (!album) notFound();

  return (
    <Shell name={album.name} count={album.item_count} shared={!!album.share_token}>
      {album.destinations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t("albumEmpty")}
          </p>
          <Link
            href="/destinations"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
          >
            <Compass className="h-4 w-4" />
            {t("findDestinations")}
          </Link>
        </div>
      ) : (
        <SavedGrid saved={asSaved(album.destinations)} />
      )}
    </Shell>
  );
}

function Shell({
  name,
  count,
  shared = false,
  children,
}: {
  name: string;
  count: number;
  shared?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("albums");

  return (
    <div className="space-y-4">
      <Link
        href="/akun/tersimpan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("allAlbums")}
      </Link>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("itemCount", { count })}
        </p>
        {shared && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint/10 px-2 py-0.5 text-xs font-semibold text-brand-700">
            <Share2 className="h-3 w-3" />
            Dibagikan
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

function Empty() {
  const t = useTranslations("albums");

  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        {t("nothingHere")}
      </p>
    </div>
  );
}

export default function AlbumPage({ params }: PageProps) {
  return (
    // Bukan komponen AccountSection: ia menuntut judul dan mencetak <h1>
    // sendiri, sementara judul di sini baru diketahui setelah albumnya dimuat.
    <section className="space-y-5">
      <Suspense fallback={<GridSkeleton />}>
        <AlbumDetail params={params} />
      </Suspense>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="h-7 w-52 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
