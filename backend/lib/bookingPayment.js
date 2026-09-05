import { createInvoice, INVOICE_DURATION_SECONDS } from "./xendit.js";
import { supabaseAdmin } from "./supabase.js";

const RPC_ERRORS = {
  INVALID_ITEMS:           [400, 'items must be an array'],
  INVALID_ITEM_COUNT:      [400, 'items must contain 1 or 2 flights'],
  INVALID_FLIGHT_TYPE:     [400, 'flight_type must be outbound or return'],
  DUPLICATE_FLIGHT_TYPE:   [400, 'flight_type cannot be the same within one booking'],
  DUPLICATE_FLIGHT_OPTION: [400, 'the same flight cannot be booked twice'],
  INVALID_FLIGHT_ID:       [400, 'flight_option_id must be a valid UUID'],
  FLIGHT_NOT_FOUND:        [404, 'Flight not found'],
  FLIGHT_ALREADY_DEPARTED: [409, 'Flight has already departed'],
  NO_SEATS_AVAILABLE:      [409, 'No seats available'],
  INVALID_PASSENGER_NAMES: [400, 'passenger_names must be an array of 1-10 non-empty names'],

  INVALID_DATES:           [400, 'check_in and check_out are required'],
  CHECKOUT_BEFORE_CHECKIN: [400, 'check_out must be after check_in'],
  CHECKIN_IN_PAST:         [400, 'check_in cannot be a date in the past'],
  INVALID_GUESTS:          [400, 'guests must be at least 1'],
  EXCEEDS_MAX_GUESTS:      [400, 'Number of guests exceeds the accommodation capacity'],
  ACCOMMODATION_NOT_FOUND: [404, 'Accommodation not found'],
  NO_ROOMS_AVAILABLE:      [409, 'No rooms available for these dates'],
  INVALID_ROOMS:           [400, 'rooms must be a non-empty array'],
  TOO_MANY_ROOMS:          [400, 'A single booking can request at most 5 rooms'],

  TICKET_NOT_FOUND:        [404, 'Ticket not found'],
  INVALID_SEAT_NUMBER:     [400, 'seat_number is required'],
  SEAT_TAKEN:              [409, 'This seat is already taken'],
  BOOKING_NOT_PAYABLE:     [409, 'This booking is no longer active'],

  BOOKING_NOT_FOUND:       [404, 'Booking not found'],
  NOT_BOOKING_OWNER:       [403, 'This booking does not belong to you'],
  UNKNOWN_BOOKING_CODE:    [400, 'Booking code is not recognized'],

  TRIP_NOT_FOUND:          [404, 'Trip not found or does not belong to you'],
  NOTHING_TO_BOOK:         [400, 'Nothing in this trip is ready to be booked'],
};

export function handleRpcError (res,error,tag) { 
    const raw = error?.message || '';

    for (const [code, [status, message]] of Object.entries(RPC_ERRORS)) {
        if (raw.includes(code)) {
            return res.status(status).json({ error: code.toLowerCase(), message });
        }
    }

    console.error(`[${tag}] unexpected rpc error`, error);
    return res.status(500).json({ error: 'server_error' });

}

// Postgres mengirim timestamp tanpa zona, sementara nilai dari Xendit sudah
// membawa zona sendiri. Keduanya harus dibaca sebagai UTC supaya perbandingan
// batas waktu tidak meleset beberapa jam.
const HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

function parseTimestamp (value) {
    if (!value) return null;

    const ms = Date.parse(HAS_TIMEZONE.test(value) ? value : `${value}Z`);
    return Number.isNaN(ms) ? null : ms;
}

/**
 * Batas akhir pembayaran sebuah booking, dalam milidetik epoch.
 *
 * Biasanya ini tanggal kedaluwarsa invoice. Kalau invoice-nya belum pernah
 * jadi dibuat (pembuatan invoice gagal), kursinya tetap tidak boleh ditahan
 * selamanya, jadi dipakai umur invoice normal dihitung dari waktu pemesanan.
 */
export function paymentDeadline (booking) {
    const fromInvoice = parseTimestamp(booking?.invoice_expires_at);
    if (fromInvoice !== null) return fromInvoice;

    const createdAt = parseTimestamp(booking?.created_at);
    if (createdAt === null) return null;

    return createdAt + INVOICE_DURATION_SECONDS * 1000;
}

/** Booking pending yang batas pembayarannya sudah lewat. */
export function isOverdue (booking) {
    if (!booking || booking.payment_status !== 'pending') return false;

    const deadline = paymentDeadline(booking);
    return deadline !== null && deadline <= Date.now();
}

/**
 * Menandai booking yang batas pembayarannya sudah lewat sebagai gagal.
 *
 * Normalnya Xendit mengirim webhook EXPIRED dan `settle_booking` dipanggil
 * dari sana, tapi webhook itu bisa saja tidak pernah sampai (server lokal,
 * tunnel mati, callback gagal). Jadi jam dinding dipakai sebagai sumber kedua:
 * begitu batas waktunya lewat, booking-nya disetel lewat rpc yang sama supaya
 * kursinya kembali dan statusnya konsisten dari jalur mana pun datangnya.
 *
 * `settle_booking` idempoten, jadi aman kalau webhook menyusul belakangan.
 * Menerima satu booking atau sekumpulan booking, dan mengembalikan true kalau
 * ada yang berubah menjadi failed.
 */
export async function settleOverdue (bookings, tag) {
    const overdue = (Array.isArray(bookings) ? bookings : [bookings]).filter(isOverdue);
    if (overdue.length === 0) return false;

    let changed = false;

    await Promise.all(overdue.map(async (booking) => {
        const { error } = await supabaseAdmin.rpc('settle_booking', {
            p_booking_code: booking.booking_code,
            p_status: 'failed',
            p_payment_method: null,
            p_invoice_id: null,
        });

        if (error) {
            console.error(`[${tag}] gagal menandai booking kedaluwarsa`, booking.booking_code, error);
            return;
        }

        // Salinan yang sudah terlanjur dibaca ikut diperbarui supaya respons
        // ini langsung menampilkan status sebenarnya, bukan status lama.
        booking.payment_status = 'failed';
        changed = true;
    }));

    return changed;
}

const SWEEP_TABLES = ['flight_bookings', 'accommodation_bookings'];

/**
 * Menyapu semua booking pending yang sudah lewat batas, bukan cuma yang
 * kebetulan sedang dibuka pembelinya. Tanpa ini, kursi pada booking yang
 * ditinggalkan begitu saja akan tertahan sampai ada yang membuka halamannya.
 */
export async function sweepOverdueBookings () {
    for (const table of SWEEP_TABLES) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('booking_code, payment_status, invoice_expires_at, created_at')
            .eq('payment_status', 'pending')
            .limit(500);

        if (error) {
            console.error(`[sweepOverdueBookings] gagal membaca ${table}`, error);
            continue;
        }

        await settleOverdue(data ?? [], `sweepOverdueBookings:${table}`);
    }
}

export async function startPayment ({ req,res,table,tag,describe}) {
    const bookingId = req.params.id;


    const { data: booking, error } = await req.db
        .from(table)
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', req.user.id)
        .maybeSingle();

    if (error) throw error;

    if (!booking) {
        return res.status(404).json({ error: 'not_found', message: 'Booking not found' });
    }

    if (booking.payment_status === 'paid') {
        return res.status(409).json({
        error: 'already_paid',
        message: 'Booking alr paid',
        });
    }

    if (booking.payment_status !== 'pending') {
         return res.status(409).json({
            error : 'booking_not_payable', 
            message: `booking status ${booking.payment_status} is not payable`
         })
    }

    // Lewat batas waktu berarti tagihannya sudah mati di sisi Xendit dan
    // kursinya dilepas. Booking-nya ditutup di sini (lewat settleOverdue,
    // bukan dicek manual pakai tanggal), supaya kursi/kamar ikut dilepas dan
    // statusnya konsisten dengan jalur webhook -- bukan cuma menolak request
    // ini tanpa membereskan booking-nya.

    if (await settleOverdue(booking, tag)) {
        return res.status(409).json({
            error: 'booking_expired',
            message: 'Batas waktu pembayaran pesanan ini sudah lewat',
        });
    }

    // Batas waktunya sudah dipastikan belum lewat di atas, jadi invoice yang
    // tersimpan pasti masih bisa dipakai.
    const stillValid = Boolean(booking.invoice_url && booking.invoice_expires_at);
    if (stillValid) {
        return res.json({
        data: {
            booking_id: booking.id,
            booking_code: booking.booking_code,
            amount: booking.total_price,
            invoice_url: booking.invoice_url,
            expires_at: booking.invoice_expires_at,
            reused: true,
        },
        });
    }

    const invoice = await createInvoice({
        externalId: booking.booking_code,
        amount: booking.total_price,
        description: describe(booking),
        payerEmail: req.user.email,
    });
    
    const {error :updateError}  = await req.db.from(table)
                                        .update({
                                            xendit_invoice_id: invoice.invoiceId,
                                            invoice_url: invoice.invoiceUrl,
                                            invoice_expires_at: invoice.expiryDate
                                        })
                                        .eq('id',booking.id); 
    if (updateError) { 
        console.error(`[${tag}] error updating invoice`, updateError);
    }

    return res.status(201).json({
        data: {
            booking_id: booking.id,
            booking_code: booking.booking_code,
            amount: booking.total_price,
            invoice_url: invoice.invoiceUrl,
            expires_at: invoice.expiryDate,
            reused: false,
        },
    })
}