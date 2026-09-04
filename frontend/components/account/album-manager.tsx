"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  ApiError,
  createAlbum,
  deleteAlbum,
  renameAlbum,
  type Album,
} from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Create, rename and delete albums, above the saved grid.
 *
 * Deleting asks first, and says plainly what survives: the album goes, the
 * destinations stay saved. Without that sentence "Hapus album" reads like it
 * throws away everything inside, which is the one thing it must not be
 * mistaken for.
 */
export function AlbumManager({ albums }: { albums: Album[] }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirming, setConfirming] = useState<Album | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = async (action: (token: string) => Promise<unknown>) => {
    setBusy(true);
    setError(null);

    const token = await getBrowserAccessToken();
    if (!token) {
      setBusy(false);
      return false;
    }

    try {
      await action(token);
      router.refresh();
      return true;
    } catch (err) {
      // Kode dari API, bukan cocok-cocokan teks.
      setError(
        err instanceof ApiError && err.code === "album_exists"
          ? "Sudah ada album dengan nama itu."
          : "Tidak berhasil. Coba lagi.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitNew = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = await run((token) => createAlbum(trimmed, { token }));
    if (ok) {
      setName("");
      setCreating(false);
    }
  };

  const submitRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const ok = await run((token) => renameAlbum(id, trimmed, { token }));
    if (ok) setEditingId(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Album</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pisahkan simpanan jadi beberapa rencana liburan. Satu destinasi
            boleh masuk lebih dari satu album.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
          >
            <FolderPlus className="h-4 w-4" />
            Album baru
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-3 flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitNew();
              if (event.key === "Escape") {
                setCreating(false);
                setName("");
              }
            }}
            placeholder="Nama album, mis. Bali 2026"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
          />
          <button
            type="button"
            onClick={() => void submitNew()}
            disabled={busy || !name.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white transition hover:bg-brand-900 disabled:opacity-50 dark:bg-brand-100 dark:text-brand-900"
            aria-label="Buat album"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setName("");
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border transition hover:bg-muted"
            aria-label="Batal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {albums.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {albums.map((album) => (
            <li
              key={album.id}
              className="flex items-center gap-2 py-2 first:pt-3"
            >
              {editingId === album.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    maxLength={60}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitRename(album.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
                  />
                  <button
                    type="button"
                    onClick={() => void submitRename(album.id)}
                    disabled={busy || !editingName.trim()}
                    className="shrink-0 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-brand-100 dark:text-brand-900"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={`#album-${album.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {album.name}
                  </a>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {album.item_count} destinasi
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(album.id);
                      setEditingName(album.name);
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={`Ganti nama album ${album.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(album)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Hapus album ${album.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming !== null}
        icon={<Trash2 className="h-5 w-5" />}
        title={`Hapus album ${confirming?.name ?? ""}?`}
        description="Albumnya saja yang hilang. Destinasi di dalamnya tetap tersimpan dan pindah ke Tanpa album."
        confirmLabel={busy ? "Menghapus..." : "Hapus album"}
        cancelLabel="Batal"
        destructive
        pending={busy}
        onConfirm={() => {
          const album = confirming;
          if (!album) return;
          void run((token) => deleteAlbum(album.id, { token })).then((ok) => {
            if (ok) setConfirming(null);
          });
        }}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
