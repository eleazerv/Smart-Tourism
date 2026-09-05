"use client";

/**
 * Jaring terakhir: dipakai hanya kalau root layout sendiri yang gagal.
 *
 * Karena yang runtuh adalah layout-nya, `app/error.tsx` tidak pernah sempat
 * dirender dan berkas ini harus menyediakan <html> serta <body> sendiri.
 * Konsekuensinya semua yang dipasang root layout ikut hilang: ThemeProvider,
 * variabel font, header, footer. Jadi halaman ini sengaja tidak mengimpor
 * satu pun komponen situs -- apa pun yang menyeret dependensi bisa jadi
 * justru penyebab runtuhnya, dan ikut menjatuhkan jaringnya sendiri.
 *
 * Warna diambil dari :root di globals.css, yang bernilai tema terang. Tanpa
 * ThemeProvider kelas `dark` tidak pernah terpasang, jadi halaman ini memang
 * selalu terang -- itu pilihan, bukan kelalaian.
 */

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Situs gagal dimuat
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Terjadi kesalahan sebelum halaman sempat tampil. Muat ulang untuk
            mencoba lagi.
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
            >
              Muat ulang
            </button>
            {/* Sengaja <a>, bukan <Link>: navigasi sisi klien akan masuk
                kembali ke pohon React yang barusan runtuh. Yang dibutuhkan
                di sini justru muat ulang penuh dari server. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-tint/10"
            >
              Kembali ke beranda
            </a>
          </div>

          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Kode kejadian: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
