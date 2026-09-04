import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { paymentDeadline, isOverdue, handleRpcError } from '../../lib/bookingPayment.js';
import { INVOICE_DURATION_SECONDS } from '../../lib/xendit.js';

describe('paymentDeadline', () => {
  test('pakai invoice_expires_at kalau ada dan bisa diparse', () => {
    const deadline = paymentDeadline({ invoice_expires_at: '2026-01-01T00:00:00Z' });
    assert.equal(deadline, Date.parse('2026-01-01T00:00:00Z'));
  });

  test('fallback ke created_at + durasi invoice kalau invoice_expires_at kosong', () => {
    const createdAt = '2026-01-01T00:00:00Z';
    const deadline = paymentDeadline({ invoice_expires_at: null, created_at: createdAt });
    assert.equal(deadline, Date.parse(createdAt) + INVOICE_DURATION_SECONDS * 1000);
  });

  test('timestamp tanpa zona (format Postgres) dibaca sebagai UTC', () => {
    const withZ = paymentDeadline({ invoice_expires_at: '2026-01-01T00:00:00Z' });
    const withoutZ = paymentDeadline({ invoice_expires_at: '2026-01-01T00:00:00' });
    assert.equal(withoutZ, withZ);
  });

  test('null kalau invoice_expires_at dan created_at dua-duanya kosong', () => {
    assert.equal(paymentDeadline({}), null);
    assert.equal(paymentDeadline(null), null);
  });

  test('null kalau timestamp tidak bisa diparse', () => {
    assert.equal(paymentDeadline({ invoice_expires_at: 'bukan-tanggal' }), null);
  });
});

describe('isOverdue', () => {
  test('false kalau booking null/undefined', () => {
    assert.equal(isOverdue(null), false);
    assert.equal(isOverdue(undefined), false);
  });

  test('false kalau status bukan pending, walau deadline sudah lewat', () => {
    assert.equal(
      isOverdue({ payment_status: 'paid', invoice_expires_at: '2000-01-01T00:00:00Z' }),
      false
    );
    assert.equal(
      isOverdue({ payment_status: 'failed', invoice_expires_at: '2000-01-01T00:00:00Z' }),
      false
    );
  });

  test('true kalau pending dan deadline sudah lewat', () => {
    assert.equal(
      isOverdue({ payment_status: 'pending', invoice_expires_at: '2000-01-01T00:00:00Z' }),
      true
    );
  });

  test('false kalau pending tapi deadline masih jauh di depan', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    assert.equal(isOverdue({ payment_status: 'pending', invoice_expires_at: future }), false);
  });

  test('false kalau pending tapi deadline tidak bisa dihitung', () => {
    assert.equal(isOverdue({ payment_status: 'pending' }), false);
  });
});

describe('handleRpcError', () => {
  function fakeRes() {
    const calls = { status: null, json: null };
    return {
      status(code) {
        calls.status = code;
        return this;
      },
      json(body) {
        calls.json = body;
        return calls;
      },
      calls,
    };
  }

  test('SEAT_TAKEN -> 409 + error code lowercase', () => {
    const res = fakeRes();
    handleRpcError(res, { message: 'error: SEAT_TAKEN' }, 'test');
    assert.equal(res.calls.status, 409);
    assert.equal(res.calls.json.error, 'seat_taken');
  });

  test('BOOKING_NOT_FOUND -> 404', () => {
    const res = fakeRes();
    handleRpcError(res, { message: 'BOOKING_NOT_FOUND' }, 'test');
    assert.equal(res.calls.status, 404);
  });

  test('NOT_BOOKING_OWNER -> 403', () => {
    const res = fakeRes();
    handleRpcError(res, { message: 'NOT_BOOKING_OWNER' }, 'test');
    assert.equal(res.calls.status, 403);
  });

  test('kode tidak dikenal -> fallback 500 server_error', () => {
    const res = fakeRes();
    handleRpcError(res, { message: 'SOME_RANDOM_POSTGRES_ERROR' }, 'test');
    assert.equal(res.calls.status, 500);
    assert.equal(res.calls.json.error, 'server_error');
  });

  test('error tanpa message -> fallback 500', () => {
    const res = fakeRes();
    handleRpcError(res, {}, 'test');
    assert.equal(res.calls.status, 500);
  });
});
