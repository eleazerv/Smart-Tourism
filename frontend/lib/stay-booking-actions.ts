"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  cancelAccommodationBooking,
  createAccommodationBooking,
  payAccommodationBooking,
  type AccommodationRoomInput,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

/**
 * Server actions behind the accommodation checkout.
 *
 * Rooms are held by `POST /api/accommodation-bookings` before any money moves,
 * exactly like seats in `booking-actions.ts`. So a payment that fails leaves a
 * real pending booking behind, and every failure path here hands back the
 * booking id — the reader is sent to it rather than losing the room silently.
 */

export type StayBookingResult =
  | { ok: true; bookingId: string; invoiceUrl: string }
  | { ok: false; message: string; bookingId?: string };

const SIGNED_OUT = "Sesi Anda sudah berakhir. Silakan masuk lagi.";

/** Turns the API error codes into something a traveller can act on. */
function messageFor(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case "no_rooms_available":
      return "Kamar untuk tanggal ini baru saja habis. Coba ubah tanggal atau kurangi jumlah kamar.";
    case "accommodation_not_found":
      return "Penginapan ini sudah tidak tersedia.";
    case "exceeds_max_guests":
      return "Jumlah tamu melebihi kapasitas satu kamar. Tambah kamar atau kurangi tamu.";
    case "checkin_in_past":
      return "Tanggal check-in sudah lewat. Pilih tanggal mulai hari ini atau sesudahnya.";
    case "checkout_before_checkin":
      return "Tanggal check-out harus setelah tanggal check-in.";
    case "invalid_dates":
      return "Tanggal menginap belum lengkap.";
    case "invalid_guests":
      return "Setiap kamar harus diisi minimal satu tamu.";
    case "invalid_rooms":
      return "Pilih dulu berapa kamar yang ingin dipesan.";
    case "too_many_rooms":
      return "Satu pesanan maksimal 5 kamar. Pisahkan menjadi beberapa pesanan.";
    case "already_paid":
      return "Pesanan ini sudah dibayar.";
    case "booking_expired":
      return "Batas waktu pembayaran pesanan ini sudah lewat. Silakan pesan ulang.";
    case "booking_not_payable":
      return "Pesanan ini sudah tidak bisa dibayar. Silakan pesan ulang.";
    case "booking_not_cancellable":
      return "Pesanan ini sudah ditutup, jadi tidak ada yang perlu dibatalkan.";
    case "payment_gateway_error":
      return "Gagal membuat tagihan pembayaran. Coba lagi sebentar lagi.";
    case "network_error":
      return "Layanan pemesanan sedang tidak dapat dihubungi.";
    default:
      return error.message || fallback;
  }
}

/** Reserves the rooms, then opens the payment invoice for them. */
export async function bookStayAndPay(
  accommodationId: string,
  rooms: AccommodationRoomInput[],
): Promise<StayBookingResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  if (rooms.length === 0) {
    return { ok: false, message: "Pilih dulu berapa kamar yang ingin dipesan." };
  }

  let bookingId: string;
  try {
    const booking = await createAccommodationBooking(
      accommodationId,
      rooms,
      { token },
    );
    bookingId = booking.id;
  } catch (error) {
    return {
      ok: false,
      message: messageFor(error, "Gagal membuat pesanan. Coba lagi."),
    };
  }

  // The rooms are held from here on, so a payment failure keeps the booking
  // id: the reader can retry payment from the order list.
  revalidatePath("/akun/pesanan");

  try {
    const payment = await payAccommodationBooking(bookingId, { token });
    return { ok: true, bookingId, invoiceUrl: payment.invoice_url };
  } catch (error) {
    return {
      ok: false,
      bookingId,
      message: messageFor(
        error,
        "Pesanan tersimpan, tetapi pembayaran belum bisa dibuka.",
      ),
    };
  }
}

/** Re-opens (or reuses) the invoice of a booking that is still pending. */
export async function payStayBooking(
  bookingId: string,
): Promise<StayBookingResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  try {
    const payment = await payAccommodationBooking(bookingId, { token });
    revalidatePath("/akun/pesanan");
    return { ok: true, bookingId, invoiceUrl: payment.invoice_url };
  } catch (error) {
    return {
      ok: false,
      bookingId,
      message: messageFor(error, "Gagal membuka pembayaran. Coba lagi."),
    };
  }
}

export type CancelResult = { ok: true } | { ok: false; message: string };

/** Releases the held rooms. The API refuses once a booking has been paid. */
export async function cancelStayBooking(
  bookingId: string,
): Promise<CancelResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  try {
    await cancelAccommodationBooking(bookingId, { token });
  } catch (error) {
    return {
      ok: false,
      message: messageFor(error, "Gagal membatalkan pesanan. Coba lagi."),
    };
  }

  revalidatePath("/akun/pesanan");
  revalidatePath(`/akun/pesanan/${bookingId}`);
  return { ok: true };
}
