import { createClient } from "@/lib/supabase/server";

/**
 * Access token for the current Supabase session, to forward to the Express API.
 *
 * `getSession()` reads the cookie without re-verifying the JWT, which is fine
 * here: the token is not trusted on this side — `authMiddleware` on the backend
 * verifies it with `supabase.auth.getUser(token)` before honouring the request.
 *
 * Reads cookies, so callers are dynamic and cannot sit inside a `"use cache"`
 * scope. Server Components only.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
