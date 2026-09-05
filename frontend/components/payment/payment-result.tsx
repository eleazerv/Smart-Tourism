import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { cn } from "@/lib/utils";

/**
 * Kerangka halaman pendaratan setelah Xendit.
 *
 * Dua halaman `/payment/*` cuma berbeda ikon dan kalimat, jadi kerangkanya
 * ditaruh di sini — bentuknya mengikuti `not-found.tsx` dan `error.tsx` supaya
 * ketiganya terasa satu keluarga.
 *
 * Halaman ini sengaja publik (proxy hanya menggerbangi `/akun`). Pengunjung
 * datang dari domain lain, dan halaman yang menendang ke login justru jadi
 * penutup transaksi yang buruk. Aman karena tidak ada apa pun tentang
 * pesanan yang ditampilkan di sini — lihat catatan di masing-masing halaman.
 */
export function PaymentResult({
  tone,
  icon,
  title,
  children,
  primaryLabel,
}: {
  tone: "positive" | "negative";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  primaryLabel: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page flex flex-col items-center py-24 text-center">
          <span
            aria-hidden="true"
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full",
              tone === "positive"
                ? "bg-brand-tint/10 text-brand-700 dark:bg-brand-700/40 dark:text-brand-100"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {icon}
          </span>

          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            {title}
          </h1>

          <div className="mt-2 max-w-md space-y-2 text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/akun/pesanan"
              className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
            >
              {primaryLabel}
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
