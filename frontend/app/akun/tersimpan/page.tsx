import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bookmark, Compass } from "lucide-react";
import {
  listAlbums,
  listSavedDestinations,
  type Album,
  type SavedDestination,
} from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { AccountSection } from "@/components/account/account-section";
import { AlbumCard } from "@/components/account/album-card";
import { NewAlbumCard } from "@/components/account/new-album-card";
import { LOOSE_SLUG } from "@/components/account/album-routes";
import { LoadError } from "@/components/home/load-error";

export const metadata: Metadata = { title: "Destinasi Tersimpan" };

/** Covers shown on an album card before it opens. */
const PREVIEW = 4;

async function SavedSection() {
  const token = await requireAccessToken();

  let saved: SavedDestination[];
  let albums: Album[];
  try {
    [saved, albums] = await Promise.all([
      listSavedDestinations({ token }),
      listAlbums({ token }),
    ]);
  } catch {
    return <LoadError what="Destinasi tersimpan" />;
  }

  // One destination can sit in several albums, so this is a lookup for the
  // cover mosaics rather than a partition of the saved list.
  const byAlbum = new Map<string, SavedDestination[]>();
  const loose: SavedDestination[] = [];

  for (const row of saved) {
    if (row.albums.length === 0) {
      loose.push(row);
      continue;
    }
    for (const album of row.albums) {
      const rows = byAlbum.get(album.id);
      if (rows) rows.push(row);
      else byAlbum.set(album.id, [row]);
    }
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          preview={(byAlbum.get(album.id) ?? []).slice(0, PREVIEW)}
        />
      ))}

      {/* Bukan album sungguhan, tapi tetap sebuah kartu: simpanan tanpa album
          harus punya tempat yang bisa dibuka, bukan menghilang dari halaman
          hanya karena belum dikelompokkan. */}
      {loose.length > 0 && (
        <article className="group overflow-hidden rounded-2xl border border-dashed border-border bg-card transition hover:border-brand-700 dark:hover:border-brand-100">
          <Link
            href={`/akun/tersimpan/${LOOSE_SLUG}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <div className="grid aspect-[4/3] place-items-center bg-muted/40">
              <Bookmark
                aria-hidden="true"
                className="h-7 w-7 text-muted-foreground"
              />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-bold">Tanpa album</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {loose.length} destinasi belum dikelompokkan
              </p>
            </div>
          </Link>
        </article>
      )}

      <NewAlbumCard />
    </div>
  );
}

export default function SavedDestinationsPage() {
  return (
    <AccountSection
      title="Destinasi tersimpan"
      description="Kumpulan album Anda. Buka salah satunya untuk melihat isinya."
    >
      <Suspense fallback={<GridSkeleton />}>
        <SavedSection />
      </Suspense>
    </AccountSection>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
