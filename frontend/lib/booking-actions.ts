"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  cancelFlightBooking,
  createFlightBooking,
  payFlightBooking,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

/**
 * Server actions behind the flight booking flow.
 *
 * Seats are held by `POST /api/flight-bookings` before any money moves, so a
 * payment that fails leaves a real pending booking behind — every failure path
 * here hands back the booking id so the reader can be sent to it rather than
 * losing the seat silently.
 */

export type BookingResult =
  | { ok: true; bookingId: string; invoiceUrl: string }
  | { ok: false; message: string; bookingId?: string };

const SIGNED_OUT = "Sesi Anda sudah berakhir. Silakan masuk lagi.";

/** Turns the API error codes into something a traveller can act on. */
function messageFor(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  switch (error.code) {
    case "no_seats_available":
      return "Kursi untuk penerbangan ini baru saja habis.";
    case "flight_already_departed":
      return "Penerbangan ini sudah berangkat.";
    case "flight_not_found":
      return "Penerbangan ini sudah tidak tersedia.";
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

/**
 * Books one seat on one flight and opens its payment invoice. One booking
 * covers one passenger, which is what `create_flight_booking` accepts.
 */
export async function bookAndPay(flightId: string): Promise<BookingResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  let bookingId: string;
  try {
    const booking = await createFlightBooking(
      [{ flight_option_id: flightId, flight_type: "outbound" }],
      { token },
    );
    bookingId = booking.id;
  } catch (error) {
    return {
      ok: false,
      message: messageFor(error, "Gagal membuat pesanan. Coba lagi."),
    };
  }

  // The seat is already held from here on, so a payment failure keeps the
  // booking id: the reader can retry payment from the order list.
  revalidatePath("/akun/pesanan");

  try {
    const payment = await payFlightBooking(bookingId, { token });
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
export async function payBooking(bookingId: string): Promise<BookingResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  try {
    const payment = await payFlightBooking(bookingId, { token });
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

/** Releases the held seats. The API refuses once a booking has been paid. */
export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, message: SIGNED_OUT };

  try {
    await cancelFlightBooking(bookingId, { token });
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
