"use client";

/**
 * Komponen klien: batas not-found ikut di-prerender bersama cangkang
 * halaman, dan sebagai komponen server tautan sadar-bahasa di sini akan
 * membaca bahasa saat request — data runtime yang membatalkan prerender
 * seluruh rute. Di sisi klien bahasanya datang dari provider.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Compass } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function DestinationNotFound() {
  const t = useTranslations("destination");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page flex flex-col items-center py-24 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-tint/10 text-brand-700">
            <Compass className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            {t("notFoundTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("notFoundBody", { url: API_BASE_URL })}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/destinations"
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              {t("browse")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-tint/10"
            >
              {t("backHome")}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
