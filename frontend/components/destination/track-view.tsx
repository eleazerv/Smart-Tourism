"use client";

import { useEffect, useRef } from "react";
import { trackDestinationView } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";

/**
 * Fire-and-forget view counter. Runs from the browser rather than the server
 * render so a prefetch or a bot crawl does not inflate the count, and sends the
 * session token when there is one so the backend can dedupe per user instead of
 * per IP.
 */
export function TrackView({ destinationId }: { destinationId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    // React runs effects twice in dev StrictMode; the backend dedupes for 24h
    // anyway, but there is no reason to send the second request.
    if (sent.current) return;
    sent.current = true;

    const controller = new AbortController();
    (async () => {
      try {
        const token = await getBrowserAccessToken();
        await trackDestinationView(destinationId, {
          token,
          signal: controller.signal,
        });
      } catch {
        // A missed view count must never surface to the visitor.
      }
    })();

    return () => controller.abort();
  }, [destinationId]);

  return null;
}
