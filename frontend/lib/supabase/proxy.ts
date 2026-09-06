import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  ONBOARDED_COOKIE,
  ONBOARDING_EXEMPT_PREFIXES,
  ONBOARDING_PATH,
  hasOnboarded,
} from "../onboarding";

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/akun", ONBOARDING_PATH];

/** Halaman yang tetap terbuka walau personalisasi belum pernah diisi. */
function isOnboardingExempt(request: NextRequest) {
  const path = request.nextUrl.pathname;
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Jelantara is a public catalogue: browsing destinations, events and the
  // heatmap must not require an account. Only the signed-in area is gated.
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Akun yang belum pernah melewati personalisasi dibawa ke wizard lebih dulu,
  // dari halaman mana pun ia mendarat -- tautan konfirmasi email dan tombol
  // masuk sama-sama bermuara di sini. Hanya untuk navigasi biasa: memantulkan
  // POST akan mematahkan server action yang sedang berjalan, termasuk milik
  // wizard itu sendiri.
  if (user && request.method === "GET" && !isOnboardingExempt(request)) {
    const onboarded =
      hasOnboarded((user as Record<string, unknown>).user_metadata) ||
      request.cookies.has(ONBOARDED_COOKIE);

    if (!onboarded) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
