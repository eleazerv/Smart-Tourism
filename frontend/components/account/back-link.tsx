import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Tautan "kembali" di puncak halaman detail.
 *
 * Batas Suspense-nya bukan hiasan. `Link` versi i18n membaca bahasa yang
 * sedang aktif untuk menyusun href-nya, dan di rute berparameter dinamis
 * (`/akun/pesanan/flight/[id]`) bahasa itu baru diketahui saat request —
 * Cache Components menolaknya di dalam cangkang yang mau di-prerender. Dengan
 * batas ini, tautannya menyusul lewat stream dan sisa cangkangnya tetap statis.
 */
export function BackLink({
  href,
  labelKey,
}: {
  href: string;
  /** Kunci di namespace `orderDetail`. */
  labelKey: string;
}) {
  return (
    <Suspense
      fallback={<span className="block h-5 w-32 rounded bg-muted" aria-hidden />}
    >
      <Anchor href={href} labelKey={labelKey} />
    </Suspense>
  );
}

async function Anchor({ href, labelKey }: { href: string; labelKey: string }) {
  const t = (k)=>k;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t(labelKey)}
    </Link>
  );
}
