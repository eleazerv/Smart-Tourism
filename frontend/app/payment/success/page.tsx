import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";
import { PaymentResult } from "@/components/payment/payment-result";

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
export const metadata: Metadata = {
  title: "Pembayaran Diterima",
  description: "Pembayaran Anda sudah diteruskan. Cek statusnya di halaman Pesanan.",
  // Halaman pendaratan transaksi tidak punya urusan di hasil pencarian.
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <PaymentResult
      tone="positive"
      icon={<CheckCheck className="h-6 w-6" />}
      title="Pembayaran diterima"
      primaryLabel="Lihat pesanan saya"
    >
      <p>
        Terima kasih — pembayaranmu sudah diteruskan ke penyedia pembayaran.
      </p>
      <p>
        Status pesanan diperbarui begitu konfirmasi resminya masuk, biasanya
        dalam hitungan detik. Buka halaman Pesanan untuk melihat keadaan
        terakhirnya; kalau di sana masih tertulis menunggu, muat ulang sebentar
        lagi.
      </p>
    </PaymentResult>
  );
}
