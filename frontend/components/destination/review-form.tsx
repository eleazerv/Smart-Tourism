"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReviewResult = { ok: boolean; message?: string };

/**
 * Write-a-review form. Posts through a Server Action so the photo is uploaded
 * with the session token attached server-side, then the page revalidates and
 * the new review appears in the list below.
 */
export function ReviewForm({
  signedIn,
  action,
}: {
  signedIn: boolean;
  /** `submitReview` bound to this destination. */
  action: (formData: FormData) => Promise<ReviewResult>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!signedIn) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Sudah pernah ke sini? Masuk untuk membagikan penilaian Anda.
        </p>
        <Link
          href="/auth/login"
          className="shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          Masuk
        </Link>
      </div>
    );
  }

  const submit = (formData: FormData) => {
    if (rating === 0) {
      setOk(false);
      setMessage("Pilih bintang dulu, dari 1 sampai 5.");
      return;
    }
    formData.set("rating", String(rating));

    startTransition(async () => {
      const result = await action(formData);
      setOk(result.ok);
      setMessage(
        result.message ?? (result.ok ? "Ulasan Anda terkirim." : "Gagal mengirim ulasan."),
      );
      if (result.ok) {
        formRef.current?.reset();
        setRating(0);
        setPhotoName(null);
      }
    });
  };

  const clearPhoto = () => {
    if (fileRef.current) fileRef.current.value = "";
    setPhotoName(null);
  };

  return (
    <form
      ref={formRef}
      action={submit}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <p className="text-sm font-semibold">Bagikan pengalaman Anda</p>

      <div
        role="radiogroup"
        aria-label="Penilaian bintang"
        className="mt-2 flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} bintang`}
            onMouseEnter={() => setHover(star)}
            onClick={() => {
              setRating(star);
              setMessage(null);
            }}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <Star
              className={cn(
                "h-7 w-7 transition",
                star <= (hover || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {rating} dari 5
          </span>
        )}
      </div>

      <label htmlFor="review-comment" className="sr-only">
        Komentar
      </label>
      <textarea
        id="review-comment"
        name="comment"
        rows={4}
        maxLength={2000}
        placeholder="Ceritakan kapan Anda datang, seramai apa, dan apa yang perlu disiapkan pengunjung berikutnya."
        className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-brand-tint/10">
          <ImagePlus className="h-4 w-4" />
          Tambah foto
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) =>
              setPhotoName(event.target.files?.[0]?.name ?? null)
            }
          />
        </label>

        {photoName && (
          <span className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs">
            <span className="truncate">{photoName}</span>
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Hapus foto terpilih"
              className="shrink-0 rounded-full p-0.5 hover:bg-background"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        <button
          type="submit"
          disabled={pending}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Mengirim..." : "Kirim ulasan"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={cn(
            "mt-3 text-sm",
            ok ? "text-brand-700" : "text-destructive",
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}
