import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleIntl = createIntlMiddleware(routing);

/**
 * Dua tugas dalam satu lintasan, dan urutannya penting.
 *
 * Pemeriksaan sesi jalan lebih dulu karena ia yang bisa memutuskan bahwa
 * request ini tidak boleh sampai ke halamannya sama sekali. Kalau tidak ada
 * pengalihan, barulah next-intl membangun respons — dialah yang menulis ulang
 * `/en/destinations` menjadi segmen `[locale]` dan menyetel cookie `NEXT_LOCALE`.
 *
 * Cookie sesi yang mungkin baru disegarkan Supabase harus ditempelkan ke
 * respons milik next-intl itu. Kalau dibiarkan menempel di respons yang
 * dibuang, token yang baru tidak pernah sampai ke browser dan pengguna akan
 * ter-logout sendiri secara acak.
 */
export async function proxy(request: NextRequest) {
  const session = await updateSession(request);
  if (session.redirect) return session.redirect;

  const response = handleIntl(request);
  for (const cookie of session.cookies) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (route handlers: tidak punya versi bahasa, dan menulis ulang
     *   path-nya justru akan mematahkannya)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
