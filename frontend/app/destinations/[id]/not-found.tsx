import Link from "next/link";
import { Compass } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

export default function DestinationNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page flex flex-col items-center py-24 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-tint/10 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100">
            <Compass className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            Destinasi tidak ditemukan
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Tautannya mungkin sudah tidak berlaku, atau API di {API_BASE_URL}
            sedang tidak berjalan sehingga datanya belum bisa dimuat.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/destinations"
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
            >
              Telusuri destinasi
            </Link>
            <Link
              href="/"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
            >
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
