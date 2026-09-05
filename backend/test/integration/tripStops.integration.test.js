// Integration test: menguji beberapa fungsi di lib/tripStops.helper.js
// bekerja SALING TERHUBUNG (resolveOrCreateStop memanggil createStop,
// urutan sequence_order dijaga lintas pemanggilan, dst) lewat fake Supabase
// client in-memory -- lihat test/helpers/fakeSupabase.js untuk kenapa bukan
// koneksi database asli (portabel tanpa kredensial, tidak menyentuh data
// siapa pun). Alur end-to-end lewat HTTP + database sungguhan tetap
// dicakup terpisah oleh test:e2e.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeDb } from '../helpers/fakeSupabase.js';
import {
  resolveOrCreateStop,
  createStop,
  nextItemSequence,
  loadOwnedStop,
} from '../../lib/tripStops.helper.js';

describe('resolveOrCreateStop + createStop', () => {
  test('bikin stop baru dengan sequence_order 1 kalau trip belum punya stop', async () => {
    const db = createFakeDb({ trip_stops: [] });

    const { stop, created } = await resolveOrCreateStop(db, 'trip-1', 10);

    assert.equal(created, true);
    assert.equal(stop.trip_id, 'trip-1');
    assert.equal(stop.city_id, 10);
    assert.equal(stop.sequence_order, 1);
  });

  test('pakai stop yang sudah ada kalau kota yang sama sudah pernah disinggahi', async () => {
    const db = createFakeDb({
      trip_stops: [{ id: 'stop-1', trip_id: 'trip-1', city_id: 10, sequence_order: 1 }],
    });

    const { stop, created } = await resolveOrCreateStop(db, 'trip-1', 10);

    assert.equal(created, false);
    assert.equal(stop.id, 'stop-1');
  });

  test('sequence_order stop baru mengikuti stop terakhir milik trip yang sama', async () => {
    const db = createFakeDb({
      trip_stops: [{ id: 'stop-1', trip_id: 'trip-1', city_id: 10, sequence_order: 1 }],
    });

    const { stop, created } = await resolveOrCreateStop(db, 'trip-1', 20);

    assert.equal(created, true);
    assert.equal(stop.sequence_order, 2);
  });

  test('trip lain dengan kota yang sama tidak ikut kepakai (terisolasi per trip)', async () => {
    const db = createFakeDb({
      trip_stops: [{ id: 'stop-1', trip_id: 'trip-A', city_id: 10, sequence_order: 1 }],
    });

    const { stop, created } = await resolveOrCreateStop(db, 'trip-B', 10);

    assert.equal(created, true);
    assert.notEqual(stop.id, 'stop-1');
    assert.equal(stop.sequence_order, 1);
  });

  test('createStop menerima field tambahan (mis. check_in/check_out)', async () => {
    const db = createFakeDb({ trip_stops: [] });

    const stop = await createStop(db, 'trip-1', 10, { check_in: '2026-11-10', check_out: '2026-11-14' });

    assert.equal(stop.check_in, '2026-11-10');
    assert.equal(stop.check_out, '2026-11-14');
  });
});

describe('nextItemSequence', () => {
  test('1 kalau stop belum punya item sama sekali', async () => {
    const db = createFakeDb({ trip_items: [] });
    assert.equal(await nextItemSequence(db, 'stop-1'), 1);
  });

  test('lanjut dari sequence_order tertinggi milik stop tersebut', async () => {
    const db = createFakeDb({
      trip_items: [
        { id: 'item-1', trip_stop_id: 'stop-1', sequence_order: 1 },
        { id: 'item-2', trip_stop_id: 'stop-1', sequence_order: 3 },
        { id: 'item-3', trip_stop_id: 'stop-2', sequence_order: 99 }, // stop lain, tidak boleh ikut kehitung
      ],
    });
    assert.equal(await nextItemSequence(db, 'stop-1'), 4);
  });
});

describe('loadOwnedStop', () => {
  test('balikin stop kalau id dan trip_id cocok', async () => {
    const db = createFakeDb({
      trip_stops: [{ id: 'stop-1', trip_id: 'trip-1', city_id: 10 }],
    });
    const stop = await loadOwnedStop(db, 'trip-1', 'stop-1');
    assert.equal(stop?.id, 'stop-1');
  });

  test('null kalau stop ada tapi milik trip lain (tidak bocor lintas trip)', async () => {
    const db = createFakeDb({
      trip_stops: [{ id: 'stop-1', trip_id: 'trip-OWNER-LAIN', city_id: 10 }],
    });
    const stop = await loadOwnedStop(db, 'trip-1', 'stop-1');
    assert.equal(stop, null);
  });
});
