"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FolderPlus, Loader2, Plus } from "lucide-react";
import {
  ApiError,
  createAlbum,
  listAlbums,
  setDestinationAlbums,
  type Album,
} from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { cn } from "@/lib/utils";

/**
 * The album chooser that follows a save.
 *
 * Deliberately opens *after* the destination is already saved, never before:
 * one tap is the whole job for most readers, and an album is an optional
 * afterthought. Dismissing this panel any way at all — Escape, a click
 * outside, the close button — leaves the save intact and the destination in
 * no album.
 *
 * Ticks apply immediately rather than waiting for a "Simpan" button. The API
 * takes the final membership list, so each tick is one idempotent PUT and
 * there is no half-applied state to reconcile if the reader walks away
 * mid-way.
 */
export function AlbumPicker({
  destinationId,
  onClose,
}: {
  destinationId: string;
  onClose: () => void;
}) {
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    void (async () => {
      const token = await getBrowserAccessToken();
      if (!token) return;
      try {
        const rows = await listAlbums({ destinationId, token });
        if (!alive) return;
        setAlbums(rows);
        setChecked(new Set(rows.filter((a) => a.contains).map((a) => a.id)));
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [destinationId]);

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  /** Sends the whole membership list; `next` is the state to end up in. */
  const apply = async (next: Set<string>) => {
    const previous = checked;
    setChecked(next);
    setError(null);
    setBusy(true);

    const token = await getBrowserAccessToken();
    if (!token) {
      setChecked(previous);
      setBusy(false);
      return;
    }

    try {
      await setDestinationAlbums(destinationId, [...next], { token });
      // The saved page groups by album, so it is stale the moment this lands.
      router.refresh();
    } catch {
      setChecked(previous);
      setError("Gagal memperbarui album. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (albumId: string) => {
    const next = new Set(checked);
    if (next.has(albumId)) next.delete(albumId);
    else next.add(albumId);
    void apply(next);
  };

  const submitNew = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);

    const token = await getBrowserAccessToken();
    if (!token) {
      setBusy(false);
      return;
    }

    try {
      const album = await createAlbum(trimmed, { token });
      setAlbums((current) => [album, ...(current ?? [])]);
      setName("");
      setCreating(false);
      // A new album made from here is one the reader wants this destination
      // in — asking them to tick it straight after would be a pointless step.
      await apply(new Set(checked).add(album.id));
    } catch (err) {
      // Kode dari API, bukan cocok-cocokan teks: pesannya bisa berubah kapan
      // saja tanpa ada yang sadar cabang ini ikut mati.
      setError(
        err instanceof ApiError && err.code === "album_exists"
          ? "Sudah ada album dengan nama itu."
          : "Album gagal dibuat. Coba lagi.",
      );
      setBusy(false);
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="font-semibold">Simpan ke album</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Selesai
        </button>
      </div>
      <p className="mt-0.5 px-1 text-xs leading-relaxed text-muted-foreground">
        Sudah tersimpan. Album hanya untuk memisahkan rencana — boleh dilewati.
      </p>

      {failed ? (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Daftar album belum bisa dimuat.
        </p>
      ) : albums === null ? (
        <ul className="mt-3 space-y-1.5" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </ul>
      ) : (
        <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {albums.map((album) => {
            const on = checked.has(album.id);
            return (
              <li key={album.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => toggle(album.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-brand-tint/10 disabled:opacity-60"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border transition",
                      on
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-border",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{album.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {album.item_count}
                  </span>
                </button>
              </li>
            );
          })}

          {albums.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              Belum ada album. Buat satu untuk memisahkan rencana liburan.
            </li>
          )}
        </ul>
      )}

      <div className="mt-2 border-t border-border pt-2">
        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={nameRef}
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitNew();
                }
                if (event.key === "Escape") {
                  // Menutup kolom ini saja, bukan seluruh panel — Escape di
                  // sini hampir selalu berarti "batal mengetik".
                  event.stopPropagation();
                  setCreating(false);
                  setName("");
                }
              }}
              placeholder="Nama album, mis. Bali 2026"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
            />
            <button
              type="button"
              onClick={() => void submitNew()}
              disabled={busy || !name.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white transition hover:bg-brand-900 disabled:opacity-50"
              aria-label="Buat album"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-medium text-brand-700 transition hover:bg-brand-tint/10"
          >
            <FolderPlus className="h-4 w-4 shrink-0" />
            Album baru
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 px-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
