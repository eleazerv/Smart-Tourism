import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/**
 * Dipanggil sekali per request untuk memuat kamus yang sesuai. Bahasa yang
 * tidak dikenal jatuh ke default alih-alih melempar error, supaya URL yang
 * diketik sembarangan berakhir sebagai halaman Indonesia, bukan 500.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
