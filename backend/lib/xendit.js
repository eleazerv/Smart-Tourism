import 'dotenv/config'

const XENDIT_BASE_URL = 'https://api.xendit.co'


export const INVOICE_DURATION_SECONDS = Number(process.env.XENDIT_INVOICE_DURATION || 1800) ; 

const PAYMENT_METHODS = [
  'QRIS',
  'BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA',
  'OVO', 'DANA', 'LINKAJA', 'SHOPEEPAY',
];

function authHeader () { 
    const key = process.env.XENDIT_SECRET_KEY; 
    if(!key) { 
        throw new Error('XENDIT_SECRET_KEY is not set');
    }

    return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}


export async function createInvoice({externalId,amount,description,payerEmail}) {
  const body = {
    external_id: externalId,
    amount: Number(amount),
    description,
    invoice_duration: INVOICE_DURATION_SECONDS,
    payment_methods: PAYMENT_METHODS,
    currency: 'IDR',
  };

  if (payerEmail) {
    body.payer_email = payerEmail;
  }

  if(process.env.PAYMENT_SUCCESS_URL) { 
    body.success_redirect_url = process.env.PAYMENT_SUCCESS_URL;
  }

  if(process.env.PAYMENT_FAILURE_URL) { 
    body.failure_redirect_url = process.env.PAYMENT_FAILURE_URL;
  }

  const res = await fetch(`${XENDIT_BASE_URL}/v2/invoices`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if(!res.ok) { 
    const err = new Error('XENDIT_CREATE_INVOICE_FAILED');
    err.status = res.status;
    err.detail = data; 
    throw err;
  }

  return { 
    invoiceId: data.id,
    invoiceUrl: data.invoice_url,
    expiryDate : data.expiry_date,
    status : data.status 
  }
}


export async function expireInvoice(invoiceId) {
  const res = await fetch(`${XENDIT_BASE_URL}/invoices/${invoiceId}/expire`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
  });
 
  if (!res.ok) {
    const err = new Error('XENDIT_EXPIRE_INVOICE_FAILED');
    err.status = res.status;
    throw err;
  }
 
  return await res.json().catch(() => null);
}