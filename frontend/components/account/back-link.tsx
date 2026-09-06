"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Tautan "kembali" di puncak halaman detail.
 *
 * Komponen klien, walaupun tidak ada interaksi di dalamnya. Ia dirender di
 * cangkang statis rute berparameter dinamis (`/akun/pesanan/flight/[id]`), dan
 * di sana `getTranslations` membaca bahasa saat request — data runtime yang
 * membatalkan prerender seluruh cangkang. Di sisi klien label dan prefiks
 * bahasanya sama-sama datang dari NextIntlClientProvider, tanpa satu pun
 * pembacaan saat request.
 */
export function BackLink({
  href,
  labelKey,
}: {
  href: string;
  /** Kunci di namespace `orderDetail`. */
  labelKey: string;
}) {
  const t = useTranslations("orderDetail");

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
