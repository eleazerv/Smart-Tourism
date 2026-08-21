"use client";

import { createClient } from "@/lib/supabase/client";

/** Browser-side counterpart of `getAccessToken`, for Client Components. */
export async function getBrowserAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
