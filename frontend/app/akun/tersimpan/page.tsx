import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import {
  listAlbums,
  listSavedDestinations,
  type Album,
  type SavedDestination,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { AccountSection } from "@/components/account/account-section";
import { AlbumManager } from "@/components/account/album-manager";
import { SavedGrid } from "@/components/account/saved-grid";
import { LoadError } from "@/components/home/load-error";

export const metadata: Metadata = { title: "Destinasi Tersimpan" };

/** Saves that belong to no album, shown last under their own heading. */
const LOOSE = "loose";

async function SavedSection() {
  const token = await requireAccessToken();

  let saved: SavedDestination[];
  let albums: Album[];
  try {
    [saved, albums] = await Promise.all([
      listSavedDestinations({ token }),
      // Fetched even though the saved rows carry their album names: an album
      // with nothing in it appears nowhere in those rows, and a reader who
      // just created one would think it failed.
      listAlbums({ token }).catch(() => [] as Album[]),
    ]);
  } catch {
    return <LoadError what="Destinasi tersimpan" />;
  }

  if (saved.length === 0 && albums.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Belum ada destinasi tersimpan. Tekan ikon penanda di kartu mana pun
          untuk menyimpannya ke sini, lalu kelompokkan ke album.
        </p>
        <Link
          href="/destinations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          <Compass className="h-4 w-4" />
          Jelajahi destinasi
        </Link>
      </div>
    );
  }

  // One destination can sit in several albums, so it is listed under each of
  // them rather than assigned to one — grouping is a view here, not a move.
  const byAlbum = new Map<string, SavedDestination[]>();
  for (const row of saved) {
    const keys = row.albums.length > 0 ? row.albums.map((a) => a.id) : [LOOSE];
    for (const key of keys) {
      const rows = byAlbum.get(key);
      if (rows) rows.push(row);
      else byAlbum.set(key, [row]);
    }
  }

  const loose = byAlbum.get(LOOSE) ?? [];

  return (
    <div className="space-y-8">
      <AlbumManager albums={albums} />

      {albums.map((album) => {
        const rows = byAlbum.get(album.id) ?? [];
        return (
          <section key={album.id} id={`album-${album.id}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight">
                {album.name}
              </h2>
              <p className="text-xs tabular-nums text-muted-foreground">
                {rows.length} destinasi
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Album ini masih kosong. Simpan sebuah destinasi, lalu centang
                album ini di panel yang muncul.
              </p>
            ) : (
              <div className="mt-3">
                <SavedGrid saved={rows} />
              </div>
            )}
          </section>
        );
      })}

      {loose.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Tanpa album
            </h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              {loose.length} destinasi
            </p>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tersimpan tapi belum masuk rencana mana pun.
          </p>
          <div className="mt-3">
            <SavedGrid saved={loose} />
          </div>
        </section>
      )}
    </div>
  );
}

export default function SavedDestinationsPage() {
  return (
    <AccountSection
      title="Destinasi tersimpan"
      description="Destinasi yang Anda tandai, dikelompokkan per album."
    >
      <Suspense fallback={<GridSkeleton />}>
        <SavedSection />
      </Suspense>
    </AccountSection>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
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
