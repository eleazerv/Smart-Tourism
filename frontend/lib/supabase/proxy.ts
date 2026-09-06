import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  ONBOARDED_COOKIE,
  ONBOARDING_EXEMPT_PREFIXES,
  ONBOARDING_PATH,
  hasOnboarded,
} from "../onboarding";
import { localisedPath, routing } from "@/i18n/routing";

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/akun", ONBOARDING_PATH];

/**
 * Hasil pemeriksaan sesi.
 *
 * Bukan lagi sebuah `NextResponse` utuh: setelah i18n masuk, respons yang
 * benar-benar dikirim dibuat oleh middleware next-intl (ia yang menulis ulang
 * `/en/...` ke segmen `[locale]`). Yang dikembalikan di sini hanya dua hal
 * yang tidak boleh hilang — perintah mengalihkan, dan cookie sesi yang baru
 * disegarkan. `proxy.ts` yang menempelkannya ke respons akhir.
 */
export type SessionCheck = {
  redirect: NextResponse | null;
  cookies: ResponseCookie[];
};

/**
 * Bahasa yang sedang dipakai, dibaca dari path.
 *
 * Bahasa default tidak berprefiks (lihat `i18n/routing.ts`), jadi ketiadaan
 * prefiks berarti Indonesia, bukan "tidak diketahui".
 */
function localeOf(pathname: string): string {
  const prefix = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  return prefix ?? routing.defaultLocale;
}

/** Path tanpa prefiks bahasa, supaya aturan di bawah cukup ditulis sekali. */
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}


/** Halaman yang tetap terbuka walau personalisasi belum pernah diisi. */
function isOnboardingExempt(path: string) {
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function updateSession(
  request: NextRequest,
): Promise<SessionCheck> {
  const cookies: ResponseCookie[] = [];

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return { redirect: null, cookies };
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
          // Ditulis ke `request` juga supaya pembacaan berikutnya di dalam
          // proses ini melihat token yang baru, bukan yang sudah kedaluwarsa.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookies.push(...cookiesToSet);
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

  const locale = localeOf(request.nextUrl.pathname);
  const path = stripLocale(request.nextUrl.pathname);

  const redirectTo = (target: string, keepSearch: boolean) => {
    const url = request.nextUrl.clone();
    url.pathname = localisedPath(target, locale);
    if (!keepSearch) url.search = "";
    return NextResponse.redirect(url);
  };

  // Jelantara is a public catalogue: browsing destinations, events and the
  // heatmap must not require an account. Only the signed-in area is gated.
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );

  if (!user && isProtected) {
    return { redirect: redirectTo("/auth/login", true), cookies };
  }

  // Akun yang belum pernah melewati personalisasi dibawa ke wizard lebih dulu,
  // dari halaman mana pun ia mendarat -- tautan konfirmasi email dan tombol
  // masuk sama-sama bermuara di sini. Hanya untuk navigasi biasa: memantulkan
  // POST akan mematahkan server action yang sedang berjalan, termasuk milik
  // wizard itu sendiri.
  if (user && request.method === "GET" && !isOnboardingExempt(path)) {
    const onboarded =
      hasOnboarded((user as Record<string, unknown>).user_metadata) ||
      request.cookies.has(ONBOARDED_COOKIE);

    if (!onboarded) {
      return { redirect: redirectTo(ONBOARDING_PATH, false), cookies };
    }
  }

  return { redirect: null, cookies };
}
