import { MessagesSquare } from "lucide-react";
import { getReviews, type Review } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { removeReview, submitReview } from "@/app/destinations/[id]/actions";
import { LoadError } from "@/components/home/load-error";
import { ReviewForm } from "@/components/destination/review-form";
import { ReviewList } from "@/components/destination/review-list";
import { ReviewSummary } from "@/components/destination/review-summary";

/**
 * Reviews block: the score breakdown, the write form, then the list.
 *
 * Reads the session cookie, so it is always dynamic — the page keeps it behind
 * its own Suspense boundary rather than holding the whole guide back.
 */
export async function ReviewsSection({
  destinationId,
  average,
}: {
  destinationId: string;
  /** `avg_rating` from the destination row — the authoritative average. */
  average: number | null;
}) {
  const token = await getAccessToken();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const currentUserId = (claims?.claims?.sub as string | undefined) ?? null;

  let reviews: Review[] | null = null;
  try {
    reviews = await getReviews(destinationId, { token });
  } catch {
    reviews = null;
  }

  return (
    <section id="ulasan" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <MessagesSquare className="h-5 w-5 text-brand-700" />
        Ulasan pengunjung
      </h2>

      {reviews === null ? (
        <div className="mt-3">
          <LoadError what="Ulasan" />
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <ReviewSummary reviews={reviews} average={average} />

          <ReviewForm
            signedIn={token !== null}
            action={submitReview.bind(null, destinationId)}
          />

          <ReviewList
            reviews={reviews}
            currentUserId={currentUserId}
            onDelete={removeReview.bind(null, destinationId)}
          />
        </div>
      )}
    </section>
  );
}
