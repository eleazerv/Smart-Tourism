import { createInvoice } from "./xendit.js";

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

  INVALID_DATES:           [400, 'check_in and check_out are required'],
  CHECKOUT_BEFORE_CHECKIN: [400, 'check_out must be after check_in'],
  CHECKIN_IN_PAST:         [400, 'check_in cannot be a date in the past'],
  INVALID_GUESTS:          [400, 'guests must be at least 1'],
  EXCEEDS_MAX_GUESTS:      [400, 'Number of guests exceeds the accommodation capacity'],
  ACCOMMODATION_NOT_FOUND: [404, 'Accommodation not found'],

  BOOKING_NOT_FOUND:       [404, 'Booking not found'],
  NOT_BOOKING_OWNER:       [403, 'This booking does not belong to you'],
  UNKNOWN_BOOKING_CODE:    [400, 'Booking code is not recognized'],
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


const stillValid = booking.invoice_url && booking.invoice_expires_at && new Date(booking.invoice_expires_at + 'Z') > new Date();
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

    