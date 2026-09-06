"use client";

/**
 * Komponen klien, walaupun tidak ada satu pun interaksi di dalamnya.
 *
 * Alasannya prerender: footer ini ikut dirender di cangkang statis setiap
 * halaman, termasuk rute berparameter dinamis seperti /destinations/[id].
 * Sebagai komponen server, `useTranslations` di sana membaca bahasa dari
 * request — data runtime, yang membatalkan prerender seluruh cangkang. Di
 * sisi klien ia membacanya dari NextIntlClientProvider, dan tidak ada yang
 * perlu dibaca saat request.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/home/logo";

/**
 * Struktur tautan pindah ke sini dari `lib/home-data.ts`: labelnya sekarang
 * kunci terjemahan, bukan teks, dan menyimpannya sebagai data mentah hanya
 * memaksa komponen ini menebak namespace mana yang harus dipakai.
 */
const COLUMNS = [
  {
    titleKey: "platform",
    links: [
      { key: "destinations", href: "/destinations" },
      { key: "hotels", href: "/hotels" },
      { key: "flights", href: "/flights" },
      { key: "map", href: "/peta" },
      { key: "bestTime", href: "/recommendations" },
    ],
  },
  {
    titleKey: "information",
    links: [
      { key: "about", href: "/about" },
      { key: "contact", href: "/kontak" },
    ],
  },
] as const;

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  // `bestTime`, `about`, dan `contact` hanya ada di kamus footer; sisanya
  // memakai label navigasi yang sama dengan header supaya tidak pernah
  // berbeda satu sama lain.
  const label = (key: string) =>
    key === "bestTime" || key === "about" || key === "contact"
      ? t(key)
      : nav(key);

  return (
    <footer className="border-t border-border bg-muted">
      <div className="container-page py-12">
        {/* Brand block carries the identity; links stay grouped on the right
            so the row reads as two blocks instead of four stray columns. */}
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-5 md:col-start-8">
            {COLUMNS.map((column) => (
              <div key={column.titleKey}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(column.titleKey)}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 underline-offset-4 transition-colors hover:text-brand-700 hover:underline"
                      >
                        {label(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("copyright", { year: "2026" })}
            </p>
            <p className="text-xs text-muted-foreground">{t("dataSource")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
