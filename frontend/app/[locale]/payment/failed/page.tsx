import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { PaymentResult } from "@/components/payment/payment-result";
import { getTranslations, setRequestLocale } from "next-intl/server";

/**
 * Pendaratan setelah Xendit memulangkan pembayar lewat jalur gagal
 * (`PAYMENT_FAILURE_URL`) — pembayaran dibatalkan, kedaluwarsa, atau ditolak.
 *
 * Judulnya "belum selesai", bukan "gagal": pesanannya sendiri tidak ke mana-
 * mana. Ia tetap ada berstatus menunggu pembayaran sampai kedaluwarsa, jadi
 * yang perlu disampaikan bukan kabar buruk melainkan cara melanjutkannya.
 *
 * Sama seperti halaman suksesnya, tidak ada detail pesanan di sini: Xendit
 * tidak menempelkan parameter apa pun ke URL ini.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return {
    title: t("failedMetaTitle"),
    description: t("failedMetaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PaymentFailedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("payment");
  return (
    <PaymentResult
      tone="negative"
      icon={<CircleAlert className="h-6 w-6" />}
      title={t("failedTitle")}
      primaryLabel={t("failedCta")}
    >
      <p>
        {t("failedBody")}
      </p>
      <p>
        {t("failedBody2")}
      </p>
    </PaymentResult>
  );
}
