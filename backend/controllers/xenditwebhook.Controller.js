import {supabaseAdmin} from '../lib/supabase.js'
export const handleXenditWebhook = async (req, res) => {
  const token = req.headers['x-callback-token'];
  const expected = process.env.XENDIT_CALLBACK_TOKEN;
 
  if (!expected) {
    console.error('[xenditWebhook] XENDIT_CALLBACK_TOKEN belum diset di .env');
    return res.status(500).json({ error: 'server_misconfigured' });
  }
 
  if (token !== expected) {
    console.warn('[xenditWebhook] token tidak cocok, request ditolak');
    return res.status(401).json({ error: 'unauthorized' });
  }
 
  const { external_id, status, payment_method, payment_channel, id: invoiceId } = req.body || {};
 
  if (!external_id || !status) {
    console.warn('[xenditWebhook] payload tidak lengkap', req.body);
    return res.status(200).json({ received: true, processed: false, reason: 'incomplete_payload' });
  }
 
  // Xendit mengirim status dalam huruf besar: PAID, EXPIRED, dan lain-lain.
  let mapped;
  if (status === 'PAID' || status === 'SETTLED') {
    mapped = 'paid';
  } else if (status === 'EXPIRED' || status === 'FAILED') {
    mapped = 'failed';
  } else {
    // Status lain (misal PENDING) tidak mengubah apa pun.
    return res.status(200).json({ received: true, processed: false, reason: `status_${status}` });
  }
 
  try {
    // settle_booking bersifat idempoten: kalau webhook yang sama dikirim
    // dua kali, pemrosesan kedua tidak mengubah apa pun dan tidak error.
    const { data, error } = await supabaseAdmin.rpc('settle_booking', {
      p_booking_code: external_id,
      p_status: mapped,
      p_payment_method: payment_channel || payment_method || null,
      p_invoice_id: invoiceId || null,
    });
 
    if (error) {
      // Booking tidak ditemukan berarti payload ini memang tidak bisa
      // diproses. Mengulang tidak akan menolong, jadi balas 200.
      if (error.message?.includes('BOOKING_NOT_FOUND') ||
          error.message?.includes('UNKNOWN_BOOKING_CODE')) {
        console.warn('[xenditWebhook] booking tidak ditemukan', external_id);
        return res.status(200).json({ received: true, processed: false, reason: 'booking_not_found' });
      }
 
      // Error lain kemungkinan sementara (koneksi database, dan sejenisnya).
      // Balas 500 supaya Xendit mengulang.
      console.error('[xenditWebhook] rpc error', error);
      return res.status(500).json({ error: 'server_error' });
    }
 
    console.log('[xenditWebhook]', external_id, status, '->', data);
 
    return res.status(200).json({ received: true, processed: true, data });
  } catch (err) {
    console.error('[xenditWebhook] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};