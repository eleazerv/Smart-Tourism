"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedDestination } from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";

/**
 * Shared behaviour behind the bookmark on a card and the "Simpan" pill on the
 * detail page.
 *
 * The flip is applied before the request so the button never feels laggy, then
 * reconciled with what the API reports — it owns the toggle, so a save made in
 * another tab lands on the right state rather than the opposite one. A failed
 * request rolls the flip back instead of leaving a lie on screen.
 *
 * Signed-out readers are sent to the login form with `next` pointing back
 * here, so the save can be finished after signing in.
 *
 * A successful save also raises `pickerOpen`, the cue for the album chooser.
 * Unsaving never raises it: offering to file something the reader just threw
 * away reads as the app arguing with them.
 */
export function useSaveToggle(destinationId: string, initialSaved: boolean) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    if (pending) return;

    const token = await getBrowserAccessToken();
    if (!token) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.push(`/auth/login?next=${encodeURIComponent(here)}`);
      return;
    }

    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const result = await toggleSavedDestination(destinationId, { token });
      setSaved(result.saved);
      if (result.saved) setPickerOpen(true);
      // The saved list is a server-rendered page; without this it keeps
      // showing a destination the reader just removed.
      router.refresh();
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);

  return { saved, pending, toggle, pickerOpen, closePicker };
}
