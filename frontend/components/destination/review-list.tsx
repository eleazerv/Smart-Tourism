"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Heart, Loader2, Trash2 } from "lucide-react";
import type { Review } from "@/lib/api";
import { likeReview } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";
import { initialsOf } from "@/components/account/initials";
import { Rating } from "@/components/home/rating";
import { relativeDate } from "@/lib/destination-data";
import { cn } from "@/lib/utils";

type Sort = "recent" | "likes";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Terbaru" },
  { value: "likes", label: "Paling disukai" },
];

export function ReviewList({
  reviews,
  currentUserId,
  onDelete,
}: {
  reviews: Review[];
  /** Null for signed-out visitors; enables the delete control on own reviews. */
  currentUserId: string | null;
  onDelete: (reviewId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [sort, setSort] = useState<Sort>("recent");

  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Belum ada ulasan. Jadilah yang pertama berbagi pengalaman di sini.
      </p>
    );
  }

  // The API already returns newest-first, so re-sorting locally avoids a round
  // trip just to flip the order of at most 50 rows.
  const ordered =
    sort === "likes"
      ? [...reviews].sort((a, b) => b.like_count - a.like_count)
      : reviews;

  return (
    <>
      <div className="mb-3 flex items-center gap-1">
        {SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={sort === option.value}
            onClick={() => setSort(option.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              sort === option.value
                ? "bg-brand-700 text-white dark:bg-brand-100 dark:text-brand-900"
                : "border border-border hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {ordered.map((review) => (
          <li key={review.id}>
            <ReviewCard
              review={review}
              mine={currentUserId !== null && review.users?.id === currentUserId}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function ReviewCard({
  review,
  mine,
  onDelete,
}: {
  review: Review;
  mine: boolean;
  onDelete: (reviewId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  // The reviews endpoint returns a total but not whether *this* visitor liked
  // the row, so the button starts unpressed and tracks the toggle locally.
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(review.like_count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const name = review.users?.full_name?.trim() || "Pengguna Smart Tourism";

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const next = !liked;
    setLiked(next);
    setLikes((count) => count + (next ? 1 : -1));

    try {
      const token = await getBrowserAccessToken();
      if (!token) throw new Error("unauthenticated");
      await likeReview(review.id, { token });
    } catch {
      setLiked(!next);
      setLikes((count) => count + (next ? -1 : 1));
      setError("Masuk dulu untuk menyukai ulasan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {review.users?.avatar_url ? (
          <Image
            src={review.users.avatar_url}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white dark:bg-brand-100 dark:text-brand-900"
          >
            {initialsOf(name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">
              {relativeDate(review.created_at)}
            </p>
          </div>
          <Rating value={review.rating} className="mt-0.5" />
        </div>
      </div>

      {review.comment && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
          {review.comment}
        </p>
      )}

      {review.photo_url && (
        <div className="relative mt-3 aspect-[3/2] w-full max-w-xs overflow-hidden rounded-xl bg-muted">
          <Image
            src={review.photo_url}
            alt={`Foto dari ulasan ${name}`}
            fill
            sizes="320px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          aria-pressed={liked}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:bg-brand-tint/10 disabled:opacity-60 dark:hover:bg-brand-tint/15",
            liked && "text-brand-700 dark:text-brand-100",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
          <span className="tabular-nums">{likes}</span>
          <span className="sr-only">suka</span>
        </button>

        {mine && (
          <button
            type="button"
            disabled={deleting}
            onClick={() =>
              startDelete(async () => {
                const result = await onDelete(review.id);
                if (!result.ok) setError(result.message ?? "Gagal menghapus.");
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Hapus
          </button>
        )}
      </div>

      {error && (
        <p role="status" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
