import { cache } from "react";
import { listSavedDestinations } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

/**
 * Ids the signed-in reader has saved, for marking the cards on a listing.
 *
 * Deliberately fetched apart from the destinations themselves. `loadPool` and
 * the other catalogue loaders run under `"use cache"` and are shared by every
 * visitor, so the `is_saved` flag the API attaches to those rows must not be
 * read there — one reader's saves would be served to the next. This runs per
 * request instead, and answers with an empty set for signed-out visitors.
 *
 * Reads the session cookie, so callers must sit inside a Suspense boundary
 * and outside any `"use cache"` scope. Wrapped in `cache()` so the several
 * rails and listings on one page share a single fetch.
 */
export const loadSavedIds = cache(async (): Promise<Set<string>> => {
  const token = await getAccessToken();
  if (!token) return new Set();

  try {
    const saved = await listSavedDestinations({ token });
    return new Set(saved.map((row) => row.id));
  } catch {
    // A missing bookmark state is worth less than the listing behind it.
    return new Set();
  }
});
