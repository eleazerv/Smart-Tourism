import { getReviewCounts, type RecommendedDestination, type SavedDestination } from "@/lib/api";
import { ResultTile } from "@/components/destinations/result-card";

/**
 * The saved list, in the same tile the catalogue's grid view uses.
 *
 * `GET /api/saved-destinations` selects a narrower column set than the
 * catalogue does — no `description` — so the rows are widened here rather than
 * giving the tile a second, nearly identical prop type.
 */
export async function SavedGrid({
  saved,
  owned = true,
}: {
  saved: SavedDestination[];
  /**
   * False on the public share page. Those visitors have no session, so a
   * filled bookmark would claim they had saved a list they have never seen,
   * and tapping it would bounce them to a login form they did not ask for.
   */
  owned?: boolean;
}) {
  const destinations: RecommendedDestination[] = saved.map((row) => ({
    id: row.id,
    name: row.name,
    description: null,
    category: row.category,
    cover_image_url: row.cover_image_url,
    avg_rating: row.avg_rating,
    view_count: row.view_count,
    provinces: row.provinces,
    cities: row.cities,
  }));

  let reviewCounts: Record<string, number> = {};
  try {
    reviewCounts = await getReviewCounts(destinations.map((d) => d.id));
  } catch {
    // Same call as the catalogue makes, and the same trade-off: the count is
    // a parenthetical, not the page.
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {destinations.map((destination, i) => (
        <ResultTile
          key={destination.id}
          destination={destination}
          reviews={reviewCounts[destination.id]}
          // Everything on the account pages is saved by definition; unsaving
          // one refreshes the route, which drops it from the list.
          saved={owned}
          priority={i < 3}
        />
      ))}
    </div>
  );
}
