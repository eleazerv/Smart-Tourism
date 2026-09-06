"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import { shareAlbum, unshareAlbum, type Album } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";

/**
 * Turns an album's public link on and off.
 *
 * Sharing is opt-in and reversible, and the copy says which of the two the
 * album is in right now — "Bagikan" that silently published a private list
 * would be the worst possible default here.
 *
 * The link goes to `/album/<token>`, a page that needs no account. The token
 * is the secret, not the album id: the id already travels in account URLs and
 * API responses, so reusing it would mean every album was effectively public
 * to anyone who had ever seen one.
 */
export function ShareAlbumDialog({
  album,
  onClose,
}: {
  album: Album;
  onClose: () => void;
}) {
  const [token, setToken] = useState<string | null>(album.share_token);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Built in the browser so the link always matches the host the reader is
  // actually on — localhost in development, the real domain in production.
  // The typeof guard is belt and braces: this dialog only mounts on a click,
  // so it never renders on the server today, but nothing in the file enforces
  // that and a crash here would take the whole page down.
  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/album/${token}`
      : null;

  const enable = async () => {
    setBusy(true);
    setError(null);

    const auth = await getBrowserAccessToken();
    if (!auth) return setBusy(false);

    try {
      setToken(await shareAlbum(album.id, { token: auth }));
      router.refresh();
    } catch {
      setError("Tautan gagal dibuat. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);

    const auth = await getBrowserAccessToken();
    if (!auth) return setBusy(false);

    try {
      await unshareAlbum(album.id, { token: auth });
      setToken(null);
      setCopied(false);
      router.refresh();
    } catch {
      setError("Tautan gagal dicabut. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked on insecure origins and in some embedded
      // browsers; the field below is selectable, so this is not a dead end.
      setError("Tidak bisa menyalin otomatis. Salin manual dari kolom di atas.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Bagikan album ${album.name}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-tint/10 text-brand-700"
            >
              <Share2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-bold tracking-tight">
                Bagikan {album.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {album.item_count} destinasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {token === null ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Album ini masih pribadi. Membuat tautan berarti siapa pun yang
              memegangnya bisa melihat daftar destinasinya tanpa perlu akun —
              tapi tidak bisa mengubah apa pun, dan namamu tidak ikut
              ditampilkan.
            </p>
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {busy ? "Membuat tautan..." : "Buat tautan"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Siapa pun yang punya tautan ini bisa melihat isinya.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={url ?? ""}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => void copy()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-900"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => void disable()}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-destructive underline-offset-4 hover:underline disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Cabut tautan
            </button>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Mencabut membuat tautan ini langsung mati. Membagikan lagi nanti
              menghasilkan tautan baru, bukan yang ini.
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
