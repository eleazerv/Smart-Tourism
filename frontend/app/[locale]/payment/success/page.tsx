import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";
import { PaymentResult } from "@/components/payment/payment-result";
import { getTranslations, setRequestLocale } from "next-intl/server";

/**
 * Pendaratan setelah Xendit memulangkan pembayar lewat jalur sukses
 * (`PAYMENT_SUCCESS_URL`).
 *
 * Halaman ini TIDAK menyatakan pesanan sudah lunas, dan itu disengaja. Yang
 * ia ketahui hanyalah bahwa Xendit memakai redirect suksesnya — bukan bahwa
 * uangnya sudah tercatat di sistem kita. Satu-satunya jalur yang boleh
 * mengubah status booking adalah webhook di `POST /api/webhooks/xendit`, dan
 * webhook itu bisa mendarat beberapa detik sesudah pembayarnya sampai di
 * sini. Menulis "pembayaran berhasil" berdasarkan URL saja berarti
 * menjanjikan sesuatu yang belum tentu sudah terjadi.
 *
 * Xendit juga tidak menempelkan parameter apa pun ke URL ini, jadi halaman
 * ini memang tidak tahu invoice mana yang barusan dibayar. Karena itu ia
 * mengantar ke halaman Pesanan, tempat statusnya dibaca dari database.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return {
    title: t("successMetaTitle"),
    description: t("successMetaDescription"),
    // Halaman pendaratan transaksi tidak punya urusan di hasil pencarian.
    robots: { index: false, follow: false },
  };
}

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("payment");
  return (
    <PaymentResult
      tone="positive"
      icon={<CheckCheck className="h-6 w-6" />}
      title={t("successTitle")}
      primaryLabel={t("successCta")}
    >
      <p>
        {t("successBody")}
      </p>
      <p>{t("successBody2")}</p>
    </PaymentResult>
  );
}
