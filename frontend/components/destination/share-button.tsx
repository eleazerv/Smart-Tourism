"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Native share sheet where the browser has one, clipboard copy everywhere
 * else — the pattern every booking site falls back to on desktop.
 */
export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // Dismissing the sheet rejects; fall through to the copy path.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — nothing to do.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium underline-offset-4 transition hover:bg-brand-tint/10 hover:underline"
    >
      {copied ? (
        <Check className="h-4 w-4 text-brand-700" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? "Tautan disalin" : "Bagikan"}
    </button>
  );
}
