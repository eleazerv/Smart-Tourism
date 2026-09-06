import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localisedPath } from "@/i18n/routing";

/**
 * Access token for the current Supabase session, to forward to the Express API.
 *
 * `getSession()` reads the cookie without re-verifying the JWT, which is fine
 * here: the token is not trusted on this side — `authMiddleware` on the backend
 * verifies it with `supabase.auth.getUser(token)` before honouring the request.
 *
 * Wrapped in `cache()` so several sections of one page share a single read.
 * Reads cookies, so callers are dynamic: under Cache Components they must sit
 * inside a `<Suspense>` boundary and cannot be in a `"use cache"` scope.
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

/**
 * Same as `getAccessToken`, but sends signed-out visitors to the login page.
 * The proxy already gates `/akun`; this covers sessions that expire mid-visit.
 * Must be called inside a Suspense boundary, like every session read.
 */
export async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  // Prefiksnya dipasang sendiri, bukan lewat `redirect` versi i18n: yang ini
  // bertipe `never`, sehingga TypeScript tahu `token` pasti terisi di bawah.
  // Tanpa bahasa yang benar, pembaca berbahasa Inggris mendarat di halaman
  // masuk berbahasa Indonesia.
  if (!token) redirect(localisedPath("/auth/login", await getLocale()));
  return token;
}
