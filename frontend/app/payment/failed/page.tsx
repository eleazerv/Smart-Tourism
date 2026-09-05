import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { PaymentResult } from "@/components/payment/payment-result";

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
export const metadata: Metadata = {
  title: "Pembayaran Belum Selesai",
  description: "Pembayaran tidak jadi diproses. Pesanan Anda masih tersimpan.",
  robots: { index: false, follow: false },
};

export default function PaymentFailedPage() {
  return (
    <PaymentResult
      tone="negative"
      icon={<CircleAlert className="h-6 w-6" />}
      title="Pembayaran belum selesai"
      primaryLabel="Buka pesanan saya"
    >
      <p>
        Pembayarannya tidak jadi diproses — mungkin dibatalkan, kedaluwarsa,
        atau ditolak penyedia pembayaran. Tidak ada dana yang terpotong.
      </p>
      <p>
        Pesananmu tidak hilang. Ia masih tersimpan dengan status menunggu
        pembayaran, dan bisa dibayar ulang dari halaman Pesanan selama belum
        kedaluwarsa.
      </p>
    </PaymentResult>
  );
}
