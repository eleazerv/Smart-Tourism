"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Images,
  Loader2,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import {
  ApiError,
  deleteAlbum,
  renameAlbum,
  type Album,
  type SavedDestination,
} from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { coverImage } from "@/lib/home-data";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShareAlbumDialog } from "@/components/account/share-album-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * One album as a card: a cover mosaic, its name, and the ⋮ menu.
 *
 * The whole card is the link into the album. The menu sits on top of it, so
 * every control inside stops its own click — a rename that also navigated
 * would lose the half-typed name.
 */
export function AlbumCard({
  album,
  preview,
}: {
  album: Album;
  /** Up to four destinations, for the cover mosaic. */
  preview: SavedDestination[];
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(album.name);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === album.name) {
      setRenaming(false);
      setName(album.name);
      return;
    }

    setBusy(true);
    setError(null);

    const token = await getBrowserAccessToken();
    if (!token) return setBusy(false);

    try {
      await renameAlbum(album.id, trimmed, { token });
      setRenaming(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "album_exists"
          ? "Nama itu sudah dipakai."
          : "Gagal mengganti nama.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    const token = await getBrowserAccessToken();
    if (!token) return setBusy(false);

    try {
      await deleteAlbum(album.id, { token });
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Gagal menghapus album.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-brand-700">
        <Link
          href={`/akun/tersimpan/${album.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          aria-label={`Buka album ${album.name}, ${album.item_count} destinasi`}
        >
          <CoverMosaic preview={preview} name={album.name} />
        </Link>

        <div className="flex items-start gap-2 p-3">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                autoFocus
                value={name}
                maxLength={60}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => void submitRename()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitRename();
                  if (event.key === "Escape") {
                    setRenaming(false);
                    setName(album.name);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
              />
            ) : (
              <Link
                href={`/akun/tersimpan/${album.id}`}
                className="block truncate text-sm font-bold underline-offset-4 hover:underline"
              >
                {album.name}
              </Link>
            )}

            <p className="mt-0.5 text-xs text-muted-foreground">
              {album.item_count} destinasi
              {album.share_token && " · dibagikan"}
            </p>

            {error && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Non-modal: mengunci scroll halaman akan mencabut scrollbar dan
              menggeser seluruh isi halaman. Lihat catatan di account-menu.tsx. */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={`Kelola album ${album.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 data-[state=open]:bg-muted"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={() => {
                  setName(album.name);
                  setRenaming(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Ganti nama
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSharing(true)}>
                <Share2 className="h-4 w-4" />
                Bagikan
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setConfirming(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>

      <ConfirmDialog
        open={confirming}
        icon={<Trash2 className="h-5 w-5" />}
        title={`Hapus album ${album.name}?`}
        description="Albumnya saja yang hilang. Destinasi di dalamnya tetap tersimpan dan pindah ke Tanpa album."
        confirmLabel={busy ? "Menghapus..." : "Hapus album"}
        cancelLabel="Batal"
        destructive
        pending={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />

      {sharing && (
        <ShareAlbumDialog album={album} onClose={() => setSharing(false)} />
      )}
    </>
  );
}

/**
 * Up to four covers in a grid, falling back to a plain panel when the album
 * is empty — an empty album should look deliberately empty, not broken.
 */
function CoverMosaic({
  preview,
  name,
}: {
  preview: SavedDestination[];
  name: string;
}) {
  if (preview.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center bg-brand-tint/10">
        <Images
          aria-hidden="true"
          className="h-7 w-7 text-brand-700/60"
        />
      </div>
    );
  }

  const tiles = preview.slice(0, 4);

  return (
    <div
      className={cn(
        "grid aspect-[4/3] gap-0.5 bg-border",
        tiles.length === 1 ? "grid-cols-1" : "grid-cols-2",
        tiles.length > 2 && "grid-rows-2",
      )}
    >
      {tiles.map((destination, i) => (
        <div
          key={destination.id}
          className={cn(
            "relative overflow-hidden bg-muted",
            // Three covers read better as one tall frame beside two stacked
            // ones than as a grid with a visible hole in it.
            tiles.length === 3 && i === 0 && "row-span-2",
          )}
        >
          <Image
            src={coverImage(destination, 600, 450)}
            alt=""
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ))}
      <span className="sr-only">{name}</span>
    </div>
  );
}
