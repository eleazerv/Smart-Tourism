import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import idMessages from "../../messages/id.json";
import enMessages from "../../messages/en.json";
import "../globals.css";

/**
 * Kamus diimpor langsung, bukan lewat `getMessages()`.
 *
 * `getMessages()` membacanya secara asinkron dari konfigurasi request, dan
 * Cache Components menghitung itu sebagai data runtime tepat di badan layout —
 * di luar batas Suspense mana pun — sehingga tidak ada satu halaman pun yang
 * bisa di-prerender. Impor statis menghilangkan pembacaan itu sepenuhnya;
 * bahasanya toh cuma dua dan keduanya sudah diketahui saat build.
 */
const MESSAGES = { id: idMessages, en: enMessages };

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const siteName = "Jelantara";

/** Kedua bahasa dirender saat build; tidak ada yang ditentukan saat request. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(defaultUrl),
    title: { default: title, template: `%s | ${siteName}` },
    description,
    applicationName: siteName,
    keywords: t("keywords").split("|"),
    // Beri tahu mesin pencari bahwa kedua versi ini halaman yang sama dalam
    // bahasa berbeda, supaya keduanya tidak saling dianggap duplikat.
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: { id: "/", en: "/en" },
    },
    openGraph: {
      type: "website",
      siteName,
      locale: locale === "en" ? "en_US" : "id_ID",
      url: locale === routing.defaultLocale ? "/" : `/${locale}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const sans = Geist({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Segmen ini menerima apa pun yang berbentuk satu ruas path, jadi bahasa
  // yang tidak dikenal harus ditolak di sini — bukan diam-diam dijatuhkan ke
  // bahasa default, yang akan membuat `/xx/akun` tampak sah.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Tanpa ini seluruh pohon di bawahnya menjadi dinamis, dan prerender yang
  // diandalkan beranda serta `/peta` ikut hilang.
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
