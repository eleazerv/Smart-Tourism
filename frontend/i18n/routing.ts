import { defineRouting } from "next-intl/routing";

/**
 * Bahasa Indonesia tetap default dan **tanpa prefiks**: `/destinations` masih
 * `/destinations`, bukan `/id/destinations`.
 *
 * Itu bukan sekadar selera. URL yang sekarang sudah dipakai di produksi tidak
 * boleh berubah — termasuk `PAYMENT_SUCCESS_URL` dan `PAYMENT_FAILURE_URL`
 * yang tersimpan di sisi Xendit, dan tautan album yang sudah dibagikan orang.
 * Hanya bahasa Inggris yang mendapat prefiks `/en`.
 */
export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** Nama bahasa dalam bahasanya sendiri, untuk pemilih bahasa di header. */
export const LOCALE_LABELS: Record<Locale, string> = {
  id: "Indonesia",
  en: "English",
};

/**
 * Menambahkan prefiks bahasa ke sebuah path aplikasi.
 *
 * Dipakai di dua tempat yang tidak bisa memakai `redirect` versi i18n: proxy
 * (yang bekerja dengan `NextResponse`) dan `requireAccessToken` (yang butuh
 * `redirect` bertipe `never` agar TypeScript tahu barisnya berhenti di situ).
 */
export function localisedPath(path: string, locale: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
