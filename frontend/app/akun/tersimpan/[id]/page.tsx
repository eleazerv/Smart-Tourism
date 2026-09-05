import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
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

export const metadata: Metadata = { title: "Album" };

type PageProps = { params: Promise<{ id: string }> };

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
  const token = await requireAccessToken();

  // The loose bucket is not an album row, so it never reaches the API.
  if (id === LOOSE_SLUG) {
    let saved: SavedDestination[];
    try {
      saved = await listSavedDestinations({ token });
    } catch {
      return <LoadError what="Destinasi tersimpan" />;
    }

    const loose = saved.filter((row) => row.albums.length === 0);

    return (
      <Shell name="Tanpa album" count={loose.length}>
        <p className="text-sm text-muted-foreground">
          Tersimpan tapi belum masuk rencana mana pun. Buka salah satunya dan
          tekan ikon penanda untuk memilih albumnya.
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
    return <LoadError what="Album" />;
  }
  if (!album) notFound();

  return (
    <Shell name={album.name} count={album.item_count} shared={!!album.share_token}>
      {album.destinations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Album ini masih kosong. Simpan sebuah destinasi, lalu centang album
            ini di panel yang muncul.
          </p>
          <Link
            href="/destinations"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            <Compass className="h-4 w-4" />
            Cari destinasi
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
  return (
    <div className="space-y-4">
      <Link
        href="/akun/tersimpan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Semua album
      </Link>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {count} destinasi
        </p>
        {shared && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint/10 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-700/40 dark:text-brand-50">
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
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Tidak ada destinasi di sini.
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
