"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { FolderPlus, Loader2, Plus, X } from "lucide-react";
import { ApiError, createAlbum } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { useTranslations } from "next-intl";

/**
 * The last tile in the album grid: a dashed placeholder that turns into a
 * name field in place.
 *
 * Creating an album from a tile in the same grid keeps the mental model
 * simple — albums are the things on this page, and here is where a new one
 * appears — rather than hiding the action in a toolbar above.
 */
export function NewAlbumCard() {
  const t = useTranslations("albums");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);

    const token = await getBrowserAccessToken();
    if (!token) return setBusy(false);

    try {
      await createAlbum(trimmed, { token });
      setName("");
      setCreating(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "album_exists"
          ? t("nameTaken")
          : t("createFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!creating) {
    return (
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition hover:border-brand-700 hover:bg-brand-tint/5 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
      >
        <FolderPlus className="h-6 w-6" />
        <span className="text-sm font-semibold">{t("newAlbum")}</span>
      </button>
    );
  }

  return (
    <div className="flex aspect-[4/3] w-full flex-col justify-center gap-2 rounded-2xl border border-brand-700 bg-card p-4">
      <label className="text-xs font-medium text-muted-foreground">
        {t("albumName")}
        <input
          autoFocus
          value={name}
          maxLength={60}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
            if (event.key === "Escape") {
              setCreating(false);
              setName("");
              setError(null);
            }
          }}
          placeholder="mis. Bali 2026"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/30"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !name.trim()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Buat
        </button>
        <button
          type="button"
          onClick={() => {
            setCreating(false);
            setName("");
            setError(null);
          }}
          aria-label="Batal"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
