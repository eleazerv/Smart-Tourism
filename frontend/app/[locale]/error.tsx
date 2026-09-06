"use client";

/**
 * Batas error untuk seluruh rute di bawah root layout.
 *
 * Next.js menukar segmen yang gagal dengan berkas ini, bukan seluruh
 * dokumen -- root layout tetap hidup. Header dan footer dipasang ulang di
 * sini supaya halaman yang rusak tetap punya jalan keluar dan tidak terasa
 * seperti situs lain.
 *
 * `reset()` merender ulang segmen itu tanpa memuat ulang halaman. Itu
 * menolong untuk kegagalan sekali lewat -- API sedang restart, fetch putus
 * di tengah jalan. Untuk bug yang deterministik ia akan gagal lagi, dan di
 * situ tautan keluarnya yang menyelamatkan; makanya keduanya selalu ada,
 * bukan tombol coba lagi saja.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page flex flex-col items-center py-24 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-tint/10 text-brand-700">
            <TriangleAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("body")}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              <RotateCcw className="h-4 w-4" />
              {t("retry")}
            </button>
            <Link
              href="/"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-tint/10"
            >
              {t("home")}
            </Link>
          </div>

          {/* Di produksi pesan aslinya sudah dibuang server sebelum sampai ke
              browser -- yang tersisa hanya digest, dan itu satu-satunya
              pegangan untuk mencocokkan laporan pengguna dengan log. */}
          {error.digest ? (
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              {t("digest", { digest: error.digest })}
            </p>
          ) : null}

          {process.env.NODE_ENV !== "production" && error.message ? (
            <pre className="mt-6 max-w-xl overflow-x-auto rounded-lg border border-border bg-muted p-4 text-left font-mono text-xs leading-relaxed text-muted-foreground">
              {error.message}
            </pre>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
