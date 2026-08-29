"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { AccommodationReview } from "@/lib/api";
import { Avatar } from "@/components/account/avatar";
import { Rating } from "@/components/home/rating";
import { relativeDate } from "@/lib/destination-data";
import { cn } from "@/lib/utils";

type Sort = "recent" | "rating";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Terbaru" },
  { value: "rating", label: "Nilai tertinggi" },
];

/**
 * Accommodation reviews. Deliberately not the destination `ReviewList`: these
 * rows carry no like aggregate, so half of that component would be dead
 * controls over a counter that does not exist here.
 */
export function StayReviewList({
  reviews,
  currentUserId,
  onDelete,
}: {
  reviews: AccommodationReview[];
  /** Null for signed-out visitors; enables the delete control on own reviews. */
  currentUserId: string | null;
  onDelete: (reviewId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [sort, setSort] = useState<Sort>("recent");

  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Belum ada ulasan untuk penginapan ini. Jadilah yang pertama.
      </p>
    );
  }

  // The API already returns newest-first, so re-sorting locally avoids a round
  // trip just to flip the order.
  const ordered =
    sort === "rating"
      ? [...reviews].sort((a, b) => b.rating - a.rating)
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
            <StayReviewCard
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

function StayReviewCard({
  review,
  mine,
  onDelete,
}: {
  review: AccommodationReview;
  mine: boolean;
  onDelete: (reviewId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const name = review.users?.full_name?.trim() || "Pengguna Smart Tourism";

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar
          name={name}
          src={review.users?.avatar_url}
          pixels={40}
          className="h-10 w-10 text-sm"
        />

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

      {mine && (
        <div className="mt-3">
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
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}
