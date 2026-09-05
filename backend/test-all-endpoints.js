#!/usr/bin/env node
/**
 * test-all-endpoints.js — Smoke test semua endpoint Smart Tourism Indonesia
 *
 * Update terbaru: menambah section Cities, Rute peta (OpenRouteService),
 * Trip non-AI (panel/checkbox langsung), dan AI Trip Planner (chat, gerbang
 * moderasi, kartu interaktif). Juga memperketat pengecekan avg_rating
 * akomodasi -- itu sekaligus memverifikasi fix SQL update_accommodation_rating()
 * SECURITY DEFINER yang sebelumnya tidak bisa dibuktikan lewat script ini
 * karena field-nya belum ikut di-select di controller.
 *
 * CARA PAKAI
 *   1. Taruh file ini di root project (sejajar main.js)
 *   2. Nyalakan server: node main.js
 *   3. Isi bagian CONFIG di bawah (atau lewat .env / env var)
 *   4. Jalankan: node test-all-endpoints.js
 *
 * ENV YANG DIPAKAI (boleh dari .env yang sudah ada):
 *   SUPABASE_URL, SUPABASE_ANON_KEY   -> untuk login ambil bearer token
 *   XENDIT_CALLBACK_TOKEN             -> opsional, untuk tes webhook
 *
 * ENV KHUSUS TES (set manual):
 *   TEST_BASE_URL   default http://localhost:4000
 *   TEST_EMAIL      email user Supabase untuk login
 *   TEST_PASSWORD   password user tersebut
 *   TEST_TOKEN      (alternatif) langsung tempel access_token, skip login
 *   TEST_PHOTO      path foto lokal, contoh: C:/Users/nama/Downloads/foto.jpg
 *   TEST_BOOKING=0  matikan tes booking+pembayaran kalau tidak mau bikin data
 *   TEST_AI_CHAT=0  matikan tes AI trip planner (perlu DEEPSEEK_API_KEY aktif
 *                   dan memanggil DeepSeek sungguhan -- ada biaya token kecil)
 *
 * CATATAN RATE LIMIT: moderateLimiter cuma 10 request/menit dan strictLimiter 5/menit.
 * Script ini otomatis menunggu kalau kena 429, jadi satu run penuh bisa makan
 * beberapa menit. Kalau mau cepat, naikkan sementara `max` di RateLimit.js.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────
// CONFIG — ganti di sini kalau tidak mau pakai env var
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:4000',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  EMAIL: process.env.TEST_EMAIL || '',
  PASSWORD: process.env.TEST_PASSWORD || '',
  TOKEN: process.env.TEST_TOKEN || '',

  // >>> GANTI INI dengan path foto di folder Downloads kamu <<<
  PHOTO_PATH: process.env.TEST_PHOTO || 'C:/Users/USERNAME/Downloads/foto.jpg',

  XENDIT_CALLBACK_TOKEN: process.env.XENDIT_CALLBACK_TOKEN || '',
  RUN_BOOKING: process.env.TEST_BOOKING !== '0',
  RUN_AI_CHAT: process.env.TEST_AI_CHAT !== '0',
};

// ─────────────────────────────────────────────────────────────
// Infrastruktur test kecil-kecilan
// ─────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', gray: '\x1b[90m', bold: '\x1b[1m',
};

const results = { pass: 0, fail: 0, skip: 0, failures: [] };
let currentSection = '';

// Full input/output capture untuk dokumentasi .md (bukan cuma cek status code)
const callLog = [];
const CAPTURE_OUT = process.env.CAPTURE_OUT || 'endpoint-capture.json';

function section(title) {
  currentSection = title;
  console.log(`\n${C.bold}${C.blue}── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}${C.reset}`);
}

function pass(name, extra = '') {
  results.pass++;
  console.log(`  ${C.green}PASS${C.reset} ${name} ${C.gray}${extra}${C.reset}`);
}

function fail(name, detail) {
  results.fail++;
  results.failures.push({ section: currentSection, name, detail });
  console.log(`  ${C.red}FAIL${C.reset} ${name}`);
  console.log(`       ${C.red}${detail}${C.reset}`);
}

function skip(name, why) {
  results.skip++;
  console.log(`  ${C.yellow}SKIP${C.reset} ${name} ${C.gray}(${why})${C.reset}`);
}

function note(msg) {
  console.log(`  ${C.gray}note: ${msg}${C.reset}`);
}

/**
 * expect(nama, res, statusYangDibolehkan, validatorOpsional)
 * validator: (body) => true | string(pesan error)
 */
function expect(name, res, allowed, validator) {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  const statusOk = list.includes(res.status);
  let validatorMsg = null;
  if (statusOk && validator) {
    const verdict = validator(res.body);
    if (verdict !== true) validatorMsg = verdict;
  }

  callLog.push({
    section: currentSection,
    name,
    input: res._input || null,
    status: res.status,
    ms: res.ms,
    output: res.body,
    verdict: !statusOk ? 'FAIL_STATUS' : validatorMsg ? 'FAIL_VALIDATOR' : 'PASS',
    detail: !statusOk
      ? `status ${res.status}, harusnya ${list.join('/')}`
      : validatorMsg || null,
  });

  if (!statusOk) {
    fail(name, `status ${res.status} (harusnya ${list.join('/')}) — ${preview(res.body)}`);
    return false;
  }
  if (validatorMsg) {
    fail(name, `status OK tapi isi response salah: ${validatorMsg} — ${preview(res.body)}`);
    return false;
  }
  pass(name, `[${res.status}] ${res.ms}ms`);
  return true;
}

function preview(body) {
  const s = typeof body === 'string' ? body : JSON.stringify(body);
  if (!s) return '(kosong)';
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// HTTP helper (auto-retry kalau kena rate limit 429)
// ─────────────────────────────────────────────────────────────
async function request(method, pathname, opts = {}) {
  const { query, body, form, auth, headers = {}, _retry = 0, _tokenRetried = false } = opts;

  let url = CONFIG.BASE_URL + pathname;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const finalHeaders = { ...headers };
  if (auth) finalHeaders.Authorization = `Bearer ${auth}`;

  let payload;
  if (form) {
    payload = form; // FormData, biarkan fetch yang set boundary
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    finalHeaders['Content-Type'] = 'application/json';
  }

  const started = Date.now();
  let res;
  try {
    res = await fetch(url, { method, headers: finalHeaders, body: payload });
  } catch (err) {
    return { status: 0, ok: false, body: `koneksi gagal: ${err.message}`, ms: Date.now() - started };
  }
  const ms = Date.now() - started;

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  // Kena rate limit -> tunggu window reset lalu ulang
  if (res.status === 429 && _retry < 2) {
    const reset = Number(res.headers.get('ratelimit-reset')) || 60;
    console.log(`  ${C.yellow}…kena rate limit, tunggu ${reset + 1}s lalu ulangi ${method} ${pathname}${C.reset}`);
    await sleep((reset + 1) * 1000);
    return request(method, pathname, { ...opts, _retry: _retry + 1 });
  }

  // Token kadaluarsa di tengah run (misal gara-gara nunggu rate limit lama)
  // -> login ulang sekali, tapi CUMA kalau token yang dipakai memang token
  // asli yang sedang aktif (ctx.token) -- bukan token sengaja rusak yang
  // dipakai tes negatif ("token ngawur" dsb), supaya tes itu tidak ikut
  // ketutup jadi sukses gara-gara di-refresh diam-diam.
  if (res.status === 401 && auth && auth === ctx.token && !_tokenRetried && CONFIG.EMAIL && CONFIG.PASSWORD) {
    console.log(`  ${C.yellow}…token kadaluarsa, login ulang lalu ulangi ${method} ${pathname}${C.reset}`);
    try {
      const freshToken = await login();
      ctx.token = freshToken;
      return request(method, pathname, { ...opts, auth: freshToken, _tokenRetried: true });
    } catch {
      // re-login gagal -> lanjut return 401 asli di bawah
    }
  }

  const out = { status: res.status, ok: res.ok, body: parsed, ms, headers: res.headers };
  out._input = {
    method,
    path: pathname,
    full_url: url,
    query: query || undefined,
    body: body,
    form: form ? summarizeForm(form) : undefined,
    auth: !!auth,
    extra_headers: Object.keys(headers).length ? headers : undefined,
  };
  return out;
}

function summarizeForm(form) {
  const out = {};
  for (const [k, v] of form.entries()) {
    if (v && typeof v === 'object' && 'size' in v && 'type' in v) {
      out[k] = { _file: true, name: v.name, type: v.type, size_bytes: v.size };
    } else {
      out[k] = v;
    }
  }
  return out;
}

const GET = (p, o) => request('GET', p, o);
const POST = (p, o) => request('POST', p, o);
const PUT = (p, o) => request('PUT', p, o);
const PATCH_ = (p, o) => request('PATCH', p, o);
const DEL = (p, o) => request('DELETE', p, o);

// ─────────────────────────────────────────────────────────────
// Foto lokal
// ─────────────────────────────────────────────────────────────
const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function loadPhoto() {
  const p = CONFIG.PHOTO_PATH;
  if (!p || !fs.existsSync(p)) {
    return { ok: false, reason: `file tidak ditemukan di "${p}"` };
  }
  const ext = path.extname(p).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return { ok: false, reason: `ekstensi "${ext}" tidak didukung (harus jpg/jpeg/png/webp)` };
  }
  const buf = fs.readFileSync(p);
  const sizeMb = buf.length / (1024 * 1024);
  if (sizeMb > 5) {
    return { ok: false, reason: `ukuran ${sizeMb.toFixed(1)}MB melebihi limit 5MB` };
  }
  return { ok: true, buf, mime, name: path.basename(p), sizeMb };
}

function photoForm(photo, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  if (photo) fd.append('photo', new Blob([photo.buf], { type: photo.mime }), photo.name);
  return fd;
}

// ─────────────────────────────────────────────────────────────
// Login Supabase -> access token
// ─────────────────────────────────────────────────────────────
async function login() {
  if (CONFIG.TOKEN) return CONFIG.TOKEN;
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY belum ada di .env');
  }
  if (!CONFIG.EMAIL || !CONFIG.PASSWORD) {
    throw new Error('TEST_EMAIL / TEST_PASSWORD belum diisi (atau pakai TEST_TOKEN)');
  }

  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CONFIG.EMAIL, password: CONFIG.PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`login Supabase gagal: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ─────────────────────────────────────────────────────────────
// Konteks yang dikumpulkan sepanjang test
// ─────────────────────────────────────────────────────────────
const ctx = {
  token: null,
  photo: null,
  destinationId: null,
  destinationName: null,
  destinationCityId: null,
  destinationLat: null,
  destinationLng: null,
  cityIds: [],
  accommodationId: null,
  accommodationLat: null,
  accommodationLng: null,
  flight: null,          // { id, date, origin, destination, flight_number }
  reviewId: null,
  accReviewId: null,
  flightBookingId: null,
  accBookingId: null,
  originalPrefTagIds: null,
  tagId: null,
  eventId: null,
  cities: [],             // dari GET /api/cities, dipakai section Cities & Trip
  roomId: null,           // dari POST /api/chat/rooms, dipakai section AI Chat & Trip
  tripId: null,
  tripItemId: null,       // item yang dibuat lewat trip.Controller (non-AI), dibersihkan sendiri
};

// ═════════════════════════════════════════════════════════════
// 1. HEALTH + MASTER DATA
// ═════════════════════════════════════════════════════════════
async function testHealthAndMaster() {
  section('1. Health & master data');

  const root = await GET('/');
  expect('GET /', root, 200);

  const tags = await GET('/api/tags');
  if (expect('GET /api/tags', tags, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array')) {
    ctx.tagId = tags.body.data[0]?.id || null;
    note(`${tags.body.data.length} tag ditemukan`);
  }

  const heat = await GET('/api/heatmap');
  expect('GET /api/heatmap', heat, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array');

  const heatPeriod = await GET('/api/heatmap', { query: { period: '2024-01' } });
  expect('GET /api/heatmap?period=2024-01', heatPeriod, 200);

  const docs = await GET('/api-docs/');
  expect('GET /api-docs (swagger UI)', docs, [200, 301, 302]);

  const notFound = await GET('/api/rute-yang-tidak-ada');
  expect('404 handler untuk rute asing', notFound, 404, (b) =>
    b?.error === 'not_found' ? true : 'error bukan not_found');
}

// ═════════════════════════════════════════════════════════════
// 2. DESTINASI (publik)
// ═════════════════════════════════════════════════════════════
async function testDestinationsPublic() {
  section('2. Destinasi (publik)');

  const list = await GET('/api/destinations');
  const ok = expect('GET /api/destinations', list, 200, (b) => {
    if (!Array.isArray(b?.data)) return 'data bukan array';
    if (typeof b.total !== 'number') return 'total tidak ada';
    if (typeof b.total_pages !== 'number') return 'total_pages tidak ada';
    return true;
  });

  if (ok) {
    const rows = list.body.data;
    ctx.destinationId = rows[0]?.id;
    ctx.destinationName = rows[0]?.name;
    ctx.destinationCityId = rows[0]?.cities?.id;
    ctx.cityIds = [...new Set(rows.map((d) => d.cities?.id).filter(Boolean))];
    note(`total ${list.body.total} destinasi, halaman 1 berisi ${rows.length}`);
    note(`pakai destinasi: ${ctx.destinationName} (${ctx.destinationId})`);

    if (!('is_saved' in (rows[0] || {}))) {
      fail('field is_saved ada di list destinasi', 'field is_saved tidak muncul sama sekali di response');
    } else {
      pass('field is_saved ada di list destinasi');
    }
  }

  const page2 = await GET('/api/destinations', { query: { page: 2 } });
  expect('GET /api/destinations?page=2', page2, [200, 404]);

  const search = await GET('/api/destinations', { query: { q: 'pantai' } });
  expect('GET /api/destinations?q=pantai', search, [200, 404]);

  const noMatch = await GET('/api/destinations', { query: { q: 'zzzqqqxyz123' } });
  expect('search tanpa hasil -> 404 not_found', noMatch, 404);

  if (ctx.destinationCityId) {
    const byCity = await GET('/api/destinations', { query: { city_id: ctx.destinationCityId } });
    expect(`GET /api/destinations?city_id=${ctx.destinationCityId}`, byCity, [200, 404]);
  }

  // ── min_rating (filter di dalam RPC search_destinations, bukan di JS) ──
  const badMinRating = await GET('/api/destinations', { query: { min_rating: 'abc' } });
  expect('min_rating bukan angka -> 400', badMinRating, 400);

  const outOfRange = await GET('/api/destinations', { query: { min_rating: 9 } });
  expect('min_rating > 5 -> 400', outOfRange, 400);

  const minRating = await GET('/api/destinations', { query: { min_rating: 4 } });
  const minRatingOk = expect('GET /api/destinations?min_rating=4', minRating, [200, 404], (b) => {
    if (!b?.data) return true; // 404 valid kalau memang tidak ada yang rating >= 4
    return b.data.every((d) => Number(d.avg_rating) >= 4) ? true : 'ada destinasi dengan avg_rating < 4 ikut lolos filter';
  });
  if (minRatingOk && minRating.status === 200) {
    // total harus <= total tanpa filter, karena filternya di dalam RPC
    // (mempengaruhi count(*) over()), bukan dipotong belakangan di JS.
    if (ok && minRating.body.total <= list.body.total) {
      pass('total dengan min_rating <= total tanpa filter (paginasi akurat)');
    } else if (ok) {
      fail('total dengan min_rating <= total tanpa filter', `${minRating.body.total} vs ${list.body.total}`);
    }
  }

  const trending = await GET('/api/destinations/trending');
  expect('GET /api/destinations/trending', trending, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array');

  for (const period of ['7d', '30d', 'all']) {
    const r = await GET('/api/destinations/trending', { query: { period } });
    expect(`GET /api/destinations/trending?period=${period}`, r, 200);
  }

  const badPeriod = await GET('/api/destinations/trending', { query: { period: 'abc' } });
  expect('trending period invalid -> 400', badPeriod, 400, (b) =>
    b?.error === 'invalid_period' ? true : `error = ${b?.error}`);

  if (!ctx.destinationId) return skip('tes detail destinasi', 'tidak dapat id destinasi');

  const detail = await GET(`/api/destinations/${ctx.destinationId}`);
  expect('GET /api/destinations/:id', detail, 200, (b) => {
    if (!b?.data?.id) return 'data.id tidak ada';
    if (!Array.isArray(b.data.tags)) return 'tags belum di-flatten jadi array';
    if (b.data.destination_tags) return 'destination_tags mentah masih ikut terkirim';
    return true;
  });
  ctx.destinationLat = detail.body?.data?.latitude ?? null;
  ctx.destinationLng = detail.body?.data?.longitude ?? null;

  const detail404 = await GET('/api/destinations/00000000-0000-0000-0000-000000000000');
  expect('GET /api/destinations/:id (uuid tidak ada) -> 404', detail404, 404);

  const view1 = await POST(`/api/destinations/${ctx.destinationId}/view`);
  expect('POST /api/destinations/:id/view (pertama)', view1, 200, (b) =>
    'tracked' in (b || {}) ? true : 'field tracked tidak ada');

  const view2 = await POST(`/api/destinations/${ctx.destinationId}/view`);
  expect('POST view kedua -> dedup, tracked:false', view2, 200, (b) =>
    b?.tracked === false ? true : `tracked = ${b?.tracked}, dedup 24 jam tidak jalan`);

  const acc = await GET(`/api/destinations/${ctx.destinationId}/accommodations`);
  if (expect('GET /api/destinations/:id/accommodations', acc, [200, 404], (b) =>
    b?.data === undefined || Array.isArray(b.data) ? true : 'data bukan array')) {
    ctx.accommodationId = acc.body?.data?.[0]?.id || null;
    ctx.accommodationLat = acc.body?.data?.[0]?.latitude ?? null;
    ctx.accommodationLng = acc.body?.data?.[0]?.longitude ?? null;
    if (acc.body?.data?.length) {
      const first = acc.body.data[0];
      note(`${acc.body.data.length} akomodasi, terdekat ${first.name} (${first.distance_km} km)`);
      const sorted = acc.body.data
        .map((a) => a.distance_km)
        .filter((d) => d !== null);
      const isSorted = sorted.every((d, i) => i === 0 || sorted[i - 1] <= d);
      isSorted
        ? pass('akomodasi terurut dari terdekat')
        : fail('akomodasi terurut dari terdekat', `urutan distance_km kacau: ${sorted.slice(0, 6).join(', ')}`);
    }
  }

  const accTier = await GET(`/api/destinations/${ctx.destinationId}/accommodations`, { query: { tier: 'budget' } });
  expect('…?tier=budget', accTier, [200, 404]);

  const accBadTier = await GET(`/api/destinations/${ctx.destinationId}/accommodations`, { query: { tier: 'mahal' } });
  expect('…?tier=mahal -> 400', accBadTier, 400);

  const reviews = await GET(`/api/destinations/${ctx.destinationId}/reviews`);
  expect('GET /api/destinations/:id/reviews', reviews, 200, (b) => {
    if (!Array.isArray(b?.data)) return 'data bukan array';
    if (b.data.length && !('like_count' in b.data[0])) return 'like_count tidak ada';
    return true;
  });

  const reviewsBadSort = await GET(`/api/destinations/${ctx.destinationId}/reviews`, { query: { sort: 'random' } });
  expect('reviews sort invalid -> 400', reviewsBadSort, 400);
}

// ═════════════════════════════════════════════════════════════
// 3. EVENTS
// ═════════════════════════════════════════════════════════════
async function testEvents() {
  section('3. Events');

  const list = await GET('/api/events');
  if (expect('GET /api/events', list, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array')) {
    ctx.eventId = list.body.data[0]?.id || null;
    note(`${list.body.data.length} event`);
  }

  const byMonth = await GET('/api/events', { query: { month: 8 } });
  expect('GET /api/events?month=8', byMonth, 200);

  const badMonth = await GET('/api/events', { query: { month: 13 } });
  expect('GET /api/events?month=13 -> 400', badMonth, 400);

  if (ctx.eventId) {
    const detail = await GET(`/api/events/${ctx.eventId}`);
    expect('GET /api/events/:id', detail, 200, (b) => b?.data?.id ? true : 'data.id tidak ada');
  } else {
    skip('GET /api/events/:id', 'tidak ada event di database');
  }

  const notFound = await GET('/api/events/00000000-0000-0000-0000-000000000000');
  expect('GET /api/events/:id (tidak ada) -> 404', notFound, 404);
}

// ═════════════════════════════════════════════════════════════
// 4. RECOMMENDATIONS (publik)
// ═════════════════════════════════════════════════════════════
async function testRecommendations() {
  section('4. Recommendations (publik)');

  const now = await GET('/api/recommendations');
  expect('GET /api/recommendations', now, 200, (b) => {
    if (!Array.isArray(b?.destinations)) return 'destinations bukan array';
    if (!Array.isArray(b?.season_info)) return 'season_info bukan array';
    return true;
  });

  const withMonth = await GET('/api/recommendations', { query: { month: 7 } });
  expect('GET /api/recommendations?month=7', withMonth, 200);

  const badMonth = await GET('/api/recommendations', { query: { month: 0 } });
  expect('month=0 -> 400', badMonth, 400);
}

// ═════════════════════════════════════════════════════════════
// 5. CITIES
// ═════════════════════════════════════════════════════════════
async function testCities() {
  section('5. Cities');

  const list = await GET('/api/cities');
  const ok = expect('GET /api/cities', list, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array');

  if (ok) {
    ctx.cities = list.body.data;
    note(`${ctx.cities.length} kota dimuat`);

    const withAirport = ctx.cities.filter((c) => c.airports?.length);
    if (withAirport.length === 0) {
      note('belum ada kota dengan data airports — bandara tidak akan muncul di peta sampai tabel airports diisi');
    } else {
      note(`${withAirport.length} kota punya data bandara (dipakai peta & section Rute)`);
    }

    const hasProvince = ctx.cities.every((c) => c.provinces?.id);
    hasProvince
      ? pass('setiap kota punya relasi provinces')
      : fail('setiap kota punya relasi provinces', 'ada kota tanpa provinces ter-embed');
  }

  const hubOnly = await GET('/api/cities', { query: { hub_only: 'true' } });
  expect('GET /api/cities?hub_only=true', hubOnly, 200, (b) => {
    if (!Array.isArray(b?.data)) return 'data bukan array';
    return b.data.every((c) => c.is_major_hub === true) ? true : 'ada kota non-hub ikut kebawa';
  });
}

// ═════════════════════════════════════════════════════════════
// 6. AKOMODASI (publik) — list mandiri + lewat destinasi
// ═════════════════════════════════════════════════════════════
async function testAccommodationsPublic() {
  section('6. Akomodasi (publik)');

  // ── GET /api/accommodations — halaman mandiri, TANPA lewat destinasi ──
  const listAll = await GET('/api/accommodations');
  expect('GET /api/accommodations (list mandiri)', listAll, [200, 404], (b) => {
    if (!b?.data) return true; // 404 valid kalau database kosong
    if (typeof b.total !== 'number') return 'total tidak ada';
    if (typeof b.total_pages !== 'number') return 'total_pages tidak ada';
    // endpoint mandiri TIDAK punya titik acuan, jadi tidak boleh ada distance_km
    if (b.data.some((a) => 'distance_km' in a)) return 'distance_km ikut muncul padahal endpoint ini tanpa titik acuan';
    return true;
  });

  const badTierList = await GET('/api/accommodations', { query: { tier: 'mahal' } });
  expect('…?tier=mahal -> 400', badTierList, 400);

  const badMinRatingList = await GET('/api/accommodations', { query: { min_rating: -1 } });
  expect('…?min_rating=-1 -> 400', badMinRatingList, 400);

  const minRatingList = await GET('/api/accommodations', { query: { min_rating: 4 } });
  expect('GET /api/accommodations?min_rating=4', minRatingList, [200, 404], (b) =>
    !b?.data ? true : b.data.every((a) => Number(a.avg_rating) >= 4) ? true : 'ada akomodasi rating < 4 ikut lolos filter');

  const searchByName = await GET('/api/accommodations', { query: { q: 'a' } });
  expect('GET /api/accommodations?q=a', searchByName, [200, 404]);

  if (ctx.destinationCityId) {
    const byCity = await GET('/api/accommodations', { query: { city_id: ctx.destinationCityId } });
    expect(`GET /api/accommodations?city_id=${ctx.destinationCityId}`, byCity, [200, 404]);
  }

  // ── Sisanya (detail, review) tetap butuh id dari destinasi ──
  if (!ctx.accommodationId) return skip('sisa tes akomodasi (detail/review)', 'tidak dapat id akomodasi dari destinasi');

  const detail = await GET(`/api/accommodations/${ctx.accommodationId}`);
  expect('GET /api/accommodations/:id', detail, 200, (b) =>
    b?.data?.cities ? true : 'relasi cities tidak ikut ter-join');

  const notFound = await GET('/api/accommodations/00000000-0000-0000-0000-000000000000');
  expect('GET /api/accommodations/:id (tidak ada) -> 404', notFound, 404);

  const reviews = await GET(`/api/accommodations/${ctx.accommodationId}/reviews`);
  expect('GET /api/accommodations/:id/reviews', reviews, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array (migration accommodation_reviews sudah dijalankan?)');

  const sortRating = await GET(`/api/accommodations/${ctx.accommodationId}/reviews`, { query: { sort: 'rating' } });
  expect('…?sort=rating', sortRating, 200);

  const badSort = await GET(`/api/accommodations/${ctx.accommodationId}/reviews`, { query: { sort: 'likes' } });
  expect('…?sort=likes -> 400 (akomodasi tidak punya like)', badSort, 400);
}

// ═════════════════════════════════════════════════════════════
// 7. PENERBANGAN
// ═════════════════════════════════════════════════════════════
function monthString(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function testFlights() {
  section('7. Penerbangan');

  const missingQuery = await GET('/api/flights/calendar');
  expect('GET /api/flights/calendar tanpa query -> 400', missingQuery, 400);

  const badMonth = await GET('/api/flights/calendar', {
    query: { origin_city_id: 1, destination_city_id: 2, month: '2026-13' },
  });
  expect('calendar month invalid -> 400', badMonth, 400);

  // Cari pasangan kota yang punya penerbangan
  const candidates = ctx.cityIds.length >= 2 ? ctx.cityIds : [1, 2, 3, 4, 5, 6];
  let found = null;

  outer:
  for (const origin of candidates) {
    for (const destination of candidates) {
      if (origin === destination) continue;
      for (const off of [0, 1]) {
        const cal = await GET('/api/flights/calendar', {
          query: { origin_city_id: origin, destination_city_id: destination, month: monthString(off) },
        });
        if (cal.status !== 200) continue;
        const day = (cal.body.data || []).find((d) => d.price != null);
        if (day) { found = { origin, destination, date: day.date, month: monthString(off) }; break outer; }
      }
    }
  }

  if (!found) {
    skip('tes kalender & list penerbangan', 'tidak ketemu rute yang ada penerbangannya');
    return;
  }

  pass(`GET /api/flights/calendar (rute ${found.origin} -> ${found.destination})`);
  note(`tanggal termurah yang dipakai: ${found.date}`);

  const calNow = await GET('/api/flights/calendar', {
    query: { origin_city_id: found.origin, destination_city_id: found.destination },
  });
  expect('calendar tanpa param month (default bulan ini)', calNow, 200, (b) =>
    Array.isArray(b?.data) && b.data.length >= 28 ? true : `panjang kalender ${b?.data?.length}`);

  const byDate = await GET('/api/flights', {
    query: { origin_city_id: found.origin, destination_city_id: found.destination, date: found.date },
  });
  if (expect('GET /api/flights?...&date=', byDate, 200, (b) =>
    Array.isArray(b?.data) && b.data.length ? true : 'tidak ada penerbangan padahal kalender bilang ada')) {
    // Pilih yang kursinya cukup buat tes booking 2 penumpang nanti, bukan
    // asal termurah -- kalau termurah kebetulan sisa 1 kursi, tes booking
    // 2 orang gagal bukan karena bug tapi karena memang kursinya kurang.
    const withSeats = byDate.body.data.find((f) => (f.available_seats ?? 0) >= 2) || byDate.body.data[0];
    ctx.flight = { ...found, id: withSeats.id, price: withSeats.price, flight_number: withSeats.flight_number };
    if ((withSeats.available_seats ?? 0) < 2) {
      note(`penerbangan terpilih cuma sisa ${withSeats.available_seats} kursi -- tes booking 2 penumpang nanti mungkin ditolak NO_SEATS_AVAILABLE bukan karena bug`);
    }
    note(`flight terpilih: ${byDate.body.data[0].airline} ${byDate.body.data[0].flight_number}, Rp${byDate.body.data[0].price}`);

    const prices = byDate.body.data.map((f) => f.price);
    const sorted = prices.every((p, i) => i === 0 || prices[i - 1] <= p);
    sorted ? pass('list penerbangan terurut harga termurah') : fail('list penerbangan terurut harga', `urutan: ${prices.join(', ')}`);
  }

  const badDate = await GET('/api/flights', {
    query: { origin_city_id: found.origin, destination_city_id: found.destination, date: '15-09-2026' },
  });
  expect('date format salah -> 400', badDate, 400);

  const badSort = await GET('/api/flights', {
    query: { origin_city_id: found.origin, destination_city_id: found.destination, date: found.date, sort: 'airline' },
  });
  expect('sort invalid -> 400', badSort, 400);

  if (ctx.flight?.id) {
    const detail = await GET(`/api/flights/${ctx.flight.id}`);
    expect('GET /api/flights/:id', detail, 200, (b) =>
      b?.data?.origin && b?.data?.destination ? true : 'relasi origin/destination tidak ter-join');
  }

  const notFound = await GET('/api/flights/00000000-0000-0000-0000-000000000000');
  expect('GET /api/flights/:id (tidak ada) -> 404', notFound, 404);

  // ── GET /api/flights/search — cari berdasarkan kode penerbangan ──
  const searchNoCode = await GET('/api/flights/search');
  expect('search tanpa flight_number -> 400', searchNoCode, 400);

  if (ctx.flight?.flight_number) {
    const searchWithDate = await GET('/api/flights/search', {
      query: { flight_number: ctx.flight.flight_number, date: ctx.flight.date },
    });
    expect('GET /api/flights/search (dengan date)', searchWithDate, [200, 404], (b) =>
      !b?.data ? true : b.data.every((f) => f.flight_number === ctx.flight.flight_number)
        ? true : 'ada hasil dengan flight_number berbeda ikut kebawa');

    const searchBadDate = await GET('/api/flights/search', {
      query: { flight_number: ctx.flight.flight_number, date: '2026/09/01' },
    });
    expect('search date format salah -> 400', searchBadDate, 400);

    const searchNoMatch = await GET('/api/flights/search', {
      query: { flight_number: 'ZZ-99999-TIDAK-ADA' },
    });
    expect('search kode tidak ada -> 404', searchNoMatch, 404);
  } else {
    skip('tes GET /api/flights/search', 'tidak dapat flight_number dari flight terpilih');
  }
}

// ═════════════════════════════════════════════════════════════
// 8. BUDGET
// ═════════════════════════════════════════════════════════════
async function testBudget() {
  section('8. Budget & pricing');

  if (!ctx.destinationId || !ctx.flight) {
    return skip('semua tes budget', 'butuh destinasi + rute penerbangan yang valid');
  }

  const noOrigin = await GET(`/api/destinations/${ctx.destinationId}/pricing`);
  expect('GET /destinations/:id/pricing tanpa origin_city_id -> 400', noOrigin, 400);

  // pricing butuh rute PP antara origin dan kota destinasi
  const pricing = await GET(`/api/destinations/${ctx.destinationId}/pricing`, {
    query: { origin_city_id: ctx.flight.origin },
  });
  expect('GET /destinations/:id/pricing', pricing, [200, 404], (b) =>
    b?.tiers === undefined || b.tiers.length === 3 ? true : `tiers cuma ${b.tiers.length}, harusnya 3`);
  if (pricing.status === 404) note(`404 = tidak ada rute PP dari kota ${ctx.flight.origin} ke kota destinasi, bukan bug`);

  // BUG CHECK: budget.Route.js mount-nya double prefix
  const bodyEstimate = {
    destination_id: ctx.destinationId,
    origin_city_id: ctx.flight.origin,
    tier: 'budget',
    duration_days: 3,
    travelers: 2,
  };

  const correctPath = await POST('/api/budget/estimate', { body: bodyEstimate, auth: ctx.token });
  const doublePath = await POST('/api/budget/budget/estimate', { body: bodyEstimate, auth: ctx.token });

  if (correctPath.status === 404 && doublePath.status !== 404) {
    fail('POST /api/budget/estimate', 'path benar 404, tapi /api/budget/budget/estimate jalan -> prefix dobel di budget.Route.js (hapus "/budget" di dalam router)');
  } else {
    expect('POST /api/budget/estimate', correctPath, [200, 404], (b) =>
      b?.breakdown === undefined || (b.breakdown.flight && b.breakdown.accommodation && b.breakdown.food)
        ? true : 'breakdown tidak lengkap');
  }

  const working = correctPath.status !== 404 ? '/api/budget/estimate' : '/api/budget/budget/estimate';
  const workingHistory = correctPath.status !== 404 ? '/api/budget/history' : '/api/budget/budget/history';

  const badTier = await POST(working, { body: { ...bodyEstimate, tier: 'sultan' }, auth: ctx.token });
  expect('estimate tier invalid -> 400', badTier, [400, 404]);

  const badDuration = await POST(working, { body: { ...bodyEstimate, duration_days: 0 }, auth: ctx.token });
  expect('estimate duration_days=0 -> 400', badDuration, [400, 404]);

  const history = await GET(workingHistory, { auth: ctx.token });
  expect('GET /api/budget/history', history, [200, 404], (b) =>
    b?.data === undefined || Array.isArray(b.data) ? true : 'data bukan array');

  const historyNoAuth = await GET(workingHistory);
  expect('GET /api/budget/history tanpa token -> 401', historyNoAuth, [401, 404]);
}

// ═════════════════════════════════════════════════════════════
// 9. AUTH + PREFERENSI
// ═════════════════════════════════════════════════════════════
async function testAuthAndPreferences() {
  section('9. Auth & preferensi');

  const me = await GET('/api/auth/me', { auth: ctx.token });
  expect('GET /api/auth/me', me, 200, (b) => b?.user?.id ? true : 'user.id tidak ada');
  if (me.status === 200) note(`login sebagai ${me.body.user.email}`);

  const noToken = await GET('/api/auth/me');
  expect('GET /api/auth/me tanpa token -> 401', noToken, 401);

  const badToken = await GET('/api/auth/me', { auth: 'token-ngawur' });
  expect('GET /api/auth/me token ngawur -> 401', badToken, 401);

  const prefs = await GET('/api/preferences', { auth: ctx.token });
  if (expect('GET /api/preferences', prefs, 200, (b) =>
    Array.isArray(b?.data) ? true : 'data bukan array')) {
    ctx.originalPrefTagIds = prefs.body.data.map((t) => t.id);
    note(`preferensi awal: ${ctx.originalPrefTagIds.length} tag (akan dikembalikan di akhir)`);
  }

  const badBody = await PUT('/api/preferences', { body: { tag_ids: 'bukan-array' }, auth: ctx.token });
  expect('PUT /api/preferences tag_ids bukan array -> 400', badBody, 400);

  if (ctx.tagId) {
    const update = await PUT('/api/preferences', { body: { tag_ids: [ctx.tagId] }, auth: ctx.token });
    expect('PUT /api/preferences', update, 200, (b) =>
      Array.isArray(b?.data) && b.data.length === 1 ? true : `data length ${b?.data?.length}, harusnya 1`);
  }

  const forYou = await GET('/api/recommendations/for-you', { auth: ctx.token });
  expect('GET /api/recommendations/for-you', forYou, 200, (b) =>
    Array.isArray(b?.destinations) ? true : 'destinations bukan array');

  const forYouNoAuth = await GET('/api/recommendations/for-you');
  expect('for-you tanpa token -> 401', forYouNoAuth, 401);
}

// ═════════════════════════════════════════════════════════════
// 10. SAVE / BOOKMARK
// ═════════════════════════════════════════════════════════════
async function testSaveBookmark() {
  section('10. Save / bookmark destinasi');

  if (!ctx.destinationId) return skip('semua tes save', 'tidak dapat id destinasi');

  const noAuth = await POST(`/api/destinations/${ctx.destinationId}/save`);
  expect('POST /destinations/:id/save tanpa token -> 401', noAuth, 401);

  const save1 = await POST(`/api/destinations/${ctx.destinationId}/save`, { auth: ctx.token });
  const wasAlreadySaved = save1.status === 200 && save1.body?.saved === false;
  expect('POST /destinations/:id/save (toggle 1)', save1, [200, 201], (b) =>
    typeof b?.saved === 'boolean' ? true : 'field saved tidak ada');

  if (wasAlreadySaved) {
    const again = await POST(`/api/destinations/${ctx.destinationId}/save`, { auth: ctx.token });
    expect('toggle balik jadi tersimpan', again, [200, 201], (b) =>
      b?.saved === true ? true : `saved = ${b?.saved}`);
  }

  const saveFake = await POST('/api/destinations/00000000-0000-0000-0000-000000000000/save', { auth: ctx.token });
  expect('save destinasi tidak ada -> 404', saveFake, [404, 500], (b) =>
    b?.error === 'not_found' ? true : `error = ${b?.error} (FK 23503 tidak ketangkap?)`);

  const list = await GET('/api/saved-destinations', { auth: ctx.token });
  expect('GET /api/saved-destinations', list, 200, (b) => {
    if (!Array.isArray(b?.data)) return 'data bukan array';
    if (!b.data.length) return 'kosong padahal barusan menyimpan destinasi';
    const row = b.data[0];
    if (!row.saved_id || !row.id || !row.name) return 'hasil belum di-flatten (saved_id/id/name)';
    if (row.destinations) return 'objek destinations mentah masih nested';
    return true;
  });

  const listNoAuth = await GET('/api/saved-destinations');
  expect('GET /api/saved-destinations tanpa token -> 401', listNoAuth, 401);

  const detail = await GET(`/api/destinations/${ctx.destinationId}`, { auth: ctx.token });
  if (detail.body?.data?.is_saved === true) {
    pass('is_saved=true di GET /destinations/:id');
  } else {
    fail('is_saved=true di GET /destinations/:id',
      `is_saved = ${detail.body?.data?.is_saved}. Route GET "/:id" di destinations.Route.js tidak pakai optionalAuth, jadi req.user selalu kosong`);
  }

  const listAuth = await GET('/api/destinations', { auth: ctx.token });
  const rowInList = (listAuth.body?.data || []).find((d) => d.id === ctx.destinationId);
  if (rowInList?.is_saved === true) {
    pass('is_saved=true di GET /destinations (list)');
  } else if (!rowInList) {
    skip('is_saved di GET /destinations (list)', 'destinasi tidak ada di halaman 1');
  } else {
    fail('is_saved=true di GET /destinations (list)',
      `is_saved = ${rowInList.is_saved}. Route GET "/" tidak pakai optionalAuth`);
  }

  const trendAuth = await GET('/api/destinations/trending', { query: { period: 'all' }, auth: ctx.token });
  const rowInTrend = (trendAuth.body?.data || []).find((d) => d.id === ctx.destinationId);
  if (!rowInTrend) {
    skip('is_saved di /destinations/trending', 'destinasi tidak masuk top 10 trending');
  } else if (rowInTrend.is_saved === true) {
    pass('is_saved=true di GET /destinations/trending');
  } else {
    fail('is_saved=true di GET /destinations/trending',
      `is_saved = ${rowInTrend.is_saved}. Route GET "/trending" tidak pakai optionalAuth`);
  }

  const unsave = await POST(`/api/destinations/${ctx.destinationId}/save`, { auth: ctx.token });
  expect('unsave (toggle balik)', unsave, [200, 201], (b) =>
    b?.saved === false ? true : `saved = ${b?.saved}, toggle tidak berbalik`);
}

// ═════════════════════════════════════════════════════════════
// 11. REVIEW DESTINASI (+ foto lokal)
// ═════════════════════════════════════════════════════════════
async function testDestinationReviews() {
  section('11. Review destinasi (upload foto)');

  if (!ctx.destinationId) return skip('semua tes review destinasi', 'tidak dapat id destinasi');

  const noAuth = await POST(`/api/destinations/${ctx.destinationId}/reviews`, {
    form: photoForm(null, { rating: 5, comment: 'test' }),
  });
  expect('POST review tanpa token -> 401', noAuth, 401);

  const badRating = await POST(`/api/destinations/${ctx.destinationId}/reviews`, {
    form: photoForm(null, { rating: 9, comment: 'rating ngawur' }),
    auth: ctx.token,
  });
  expect('rating 9 -> 400 invalid_rating', badRating, [400, 409], (b) =>
    b?.error === 'invalid_rating' || b?.error === 'already_reviewed' ? true : `error = ${b?.error}`);

  if (!ctx.photo?.ok) {
    skip('POST review dengan foto', ctx.photo?.reason || 'foto tidak tersedia');
  } else {
    const create = await POST(`/api/destinations/${ctx.destinationId}/reviews`, {
      form: photoForm(ctx.photo, { rating: 4, comment: `Review otomatis dari test script ${new Date().toISOString()}` }),
      auth: ctx.token,
    });

    if (create.status === 409) {
      note('user ini sudah pernah review destinasi ini — hapus dulu review lamanya kalau mau tes create+foto');
      pass('POST review kedua kali -> 409 already_reviewed');
    } else if (expect('POST review + foto', create, 201, (b) => {
      if (!b?.data?.id) return 'data.id tidak ada';
      if (!b.data.photo_url) return 'photo_url kosong padahal foto dikirim';
      if (!b.data.users) return 'relasi users tidak ikut';
      if (b.data.like_count !== 0) return `like_count = ${b.data.like_count}, harusnya 0`;
      return true;
    })) {
      ctx.reviewId = create.body.data.id;
      note(`photo_url: ${create.body.data.photo_url}`);

      const photoRes = await fetch(create.body.data.photo_url);
      photoRes.ok
        ? pass('foto bisa diakses dari Supabase Storage', `[${photoRes.status}]`)
        : fail('foto bisa diakses dari Supabase Storage', `status ${photoRes.status} — bucket "review-photos" belum public?`);
    }
  }

  const txtForm = new FormData();
  txtForm.append('rating', '3');
  txtForm.append('photo', new Blob(['bukan gambar'], { type: 'text/plain' }), 'catatan.txt');
  const badFile = await POST(`/api/destinations/${ctx.destinationId}/reviews`, { form: txtForm, auth: ctx.token });
  expect('upload file .txt -> 400 invalid_file_type', badFile, 400, (b) =>
    b?.error === 'invalid_file_type' ? true : `error = ${b?.error}`);

  const targetReview = ctx.reviewId || (await GET(`/api/destinations/${ctx.destinationId}/reviews`)).body?.data?.[0]?.id;
  if (!targetReview) {
    skip('tes like review', 'tidak ada review untuk di-like');
  } else {
    const like1 = await POST(`/api/destinations/reviews/${targetReview}/like`, { auth: ctx.token });
    expect('POST /destinations/reviews/:id/like (toggle 1)', like1, [200, 201], (b) =>
      typeof b?.liked === 'boolean' ? true : 'field liked tidak ada');
    const likedAfterFirst = like1.body?.liked;

    const like2 = await POST(`/api/destinations/reviews/${targetReview}/like`, { auth: ctx.token });
    expect('like toggle 2 (harus berbalik)', like2, [200, 201], (b) =>
      b?.liked === !likedAfterFirst ? true : `liked = ${b?.liked}, tidak berbalik dari toggle 1 (${likedAfterFirst})`);

    const likeNoAuth = await POST(`/api/destinations/reviews/${targetReview}/like`);
    expect('like tanpa token -> 401', likeNoAuth, 401);

    const sortLikes = await GET(`/api/destinations/${ctx.destinationId}/reviews`, { query: { sort: 'likes' } });
    expect('GET reviews?sort=likes', sortLikes, 200, (b) => {
      const counts = (b?.data || []).map((r) => r.like_count);
      return counts.every((c, i) => i === 0 || counts[i - 1] >= c) ? true : `urutan like_count salah: ${counts.join(', ')}`;
    });
  }

  if (ctx.reviewId) {
    const dest = await GET(`/api/destinations/${ctx.destinationId}`);
    const avg = dest.body?.data?.avg_rating;
    avg && Number(avg) > 0
      ? pass('trigger avg_rating destinasi terisi', `avg_rating = ${avg}`)
      : fail('trigger avg_rating destinasi terisi', `avg_rating = ${avg} setelah ada review`);
  }
}

// ═════════════════════════════════════════════════════════════
// 12. REVIEW AKOMODASI
// ═════════════════════════════════════════════════════════════
async function testAccommodationReviews() {
  section('12. Review akomodasi (fitur baru)');

  if (!ctx.accommodationId) return skip('semua tes review akomodasi', 'tidak dapat id akomodasi');

  const noAuth = await POST(`/api/accommodations/${ctx.accommodationId}/reviews`, {
    form: photoForm(null, { rating: 5 }),
  });
  expect('POST review akomodasi tanpa token -> 401', noAuth, 401);

  const badRating = await POST(`/api/accommodations/${ctx.accommodationId}/reviews`, {
    form: photoForm(null, { rating: 0 }),
    auth: ctx.token,
  });
  expect('rating 0 -> 400', badRating, [400, 409]);

  const fakeAcc = await POST('/api/accommodations/00000000-0000-0000-0000-000000000000/reviews', {
    form: photoForm(null, { rating: 4 }),
    auth: ctx.token,
  });
  expect('review akomodasi tidak ada -> 404', fakeAcc, 404);

  if (!ctx.photo?.ok) {
    skip('POST review akomodasi + foto', ctx.photo?.reason || 'foto tidak tersedia');
  } else {
    const create = await POST(`/api/accommodations/${ctx.accommodationId}/reviews`, {
      form: photoForm(ctx.photo, { rating: 5, comment: `Review akomodasi otomatis ${new Date().toISOString()}` }),
      auth: ctx.token,
    });

    if (create.status === 409) {
      pass('POST review akomodasi kedua kali -> 409 already_reviewed');
    } else if (expect('POST review akomodasi + foto', create, 201, (b) => {
      if (!b?.data?.id) return 'data.id tidak ada';
      if (!b.data.photo_url) return 'photo_url kosong padahal foto dikirim';
      return true;
    })) {
      ctx.accReviewId = create.body.data.id;
      const photoRes = await fetch(create.body.data.photo_url);
      photoRes.ok
        ? pass('foto review akomodasi bisa diakses', `[${photoRes.status}]`)
        : fail('foto review akomodasi bisa diakses', `status ${photoRes.status} — bucket "accommodation-review-photos" sudah dibuat & public?`);
    }
  }

  if (ctx.accReviewId) {
    const detail = await GET(`/api/accommodations/${ctx.accommodationId}`);
    const avg = detail.body?.data?.avg_rating;
    if (avg === undefined) {
      fail('trigger avg_rating akomodasi terisi', 'field avg_rating tidak ada di response GET /api/accommodations/:id — cek select di accommodations.Controller.js');
    } else if (Number(avg) > 0) {
      pass('trigger avg_rating akomodasi terisi (SECURITY DEFINER OK)', `avg_rating = ${avg}`);
    } else {
      fail('trigger avg_rating akomodasi terisi', `avg_rating = ${avg} setelah ada review — kemungkinan update_accommodation_rating() belum SECURITY DEFINER, cek migration`);
    }
  }

  const deleteFake = await DEL('/api/accommodations/reviews/00000000-0000-0000-0000-000000000000', { auth: ctx.token });
  expect('DELETE review akomodasi milik orang lain/tidak ada -> 404', deleteFake, 404);
}

// ═════════════════════════════════════════════════════════════
// 13. BOOKING PENERBANGAN (+ tiket & kursi)
// ═════════════════════════════════════════════════════════════
async function testFlightBookings() {
  section('13. Booking penerbangan + tiket & kursi');

  if (!CONFIG.RUN_BOOKING) return skip('semua tes booking penerbangan', 'TEST_BOOKING=0');
  if (!ctx.flight?.id) return skip('semua tes booking penerbangan', 'tidak dapat flight_option_id');

  const twoNames = ['Budi Santoso', 'Siti Aminah']; // dipakai berulang di bawah -- 2 penumpang

  const noAuth = await POST('/api/flight-bookings', { body: { items: [], passenger_names: twoNames } });
  expect('POST /api/flight-bookings tanpa token -> 401', noAuth, 401);

  const notArray = await POST('/api/flight-bookings', {
    body: { items: 'bukan array', passenger_names: twoNames }, auth: ctx.token,
  });
  expect('items bukan array -> 400', notArray, 400);

  const emptyItems = await POST('/api/flight-bookings', {
    body: { items: [], passenger_names: twoNames }, auth: ctx.token,
  });
  expect('items kosong -> 400 invalid_item_count', emptyItems, 400);

  const noPassengers = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: ctx.flight.id, flight_type: 'outbound' }] },
    auth: ctx.token,
  });
  expect('tanpa passenger_names -> 400', noPassengers, 400);

  const emptyPassengers = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: ctx.flight.id, flight_type: 'outbound' }], passenger_names: [] },
    auth: ctx.token,
  });
  expect('passenger_names kosong -> 400', emptyPassengers, 400);

  const blankName = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: ctx.flight.id, flight_type: 'outbound' }], passenger_names: ['   '] },
    auth: ctx.token,
  });
  expect('passenger_names berisi nama kosong -> 400 (dari RPC INVALID_PASSENGER_NAMES)', blankName, 400);

  const badType = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: ctx.flight.id, flight_type: 'pulang-pergi' }], passenger_names: twoNames },
    auth: ctx.token,
  });
  expect('flight_type ngawur -> 400', badType, 400);

  const fakeFlight = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: '00000000-0000-0000-0000-000000000000', flight_type: 'outbound' }], passenger_names: twoNames },
    auth: ctx.token,
  });
  expect('flight_option_id tidak ada -> 404', fakeFlight, 404);

  const before = await GET(`/api/flights/${ctx.flight.id}`);
  const seatsBefore = before.body?.data?.available_seats;

  const create = await POST('/api/flight-bookings', {
    body: { items: [{ flight_option_id: ctx.flight.id, flight_type: 'outbound' }], passenger_names: twoNames },
    auth: ctx.token,
  });
  const created = expect('POST /api/flight-bookings (2 penumpang)', create, 201, (b) => {
    if (!b?.data?.id) return 'data.id tidak ada';
    if (!b.data.booking_code) return 'booking_code tidak ada';
    if (b.data.payment_status !== 'pending') return `payment_status = ${b.data.payment_status}, harusnya pending`;
    if (!Array.isArray(b.data.flight_booking_items) || !b.data.flight_booking_items.length) return 'flight_booking_items kosong';
    if (!Array.isArray(b.data.tickets)) return 'tickets tidak ada -- cek shapeBookingWithTickets & select flight_tickets';
    if (b.data.tickets.length !== twoNames.length) return `tickets.length = ${b.data.tickets.length}, harusnya ${twoNames.length} (1 tiket per orang per leg)`;
    if (!b.data.tickets.every((t) => t.ticket_code && t.full_name && t.flight_type)) return 'ada tiket yang field-nya tidak lengkap';
    return true;
  });

  if (!created) return;
  ctx.flightBookingId = create.body.data.id;
  const ticketIds = create.body.data.tickets.map((t) => t.id).filter(Boolean);
  note(`booking_code: ${create.body.data.booking_code}, total Rp${create.body.data.total_price}, ${create.body.data.tickets?.length} tiket`);
  note(`kode tiket: ${create.body.data.tickets?.map((t) => t.ticket_code).join(', ')}`);

  const after = await GET(`/api/flights/${ctx.flight.id}`);
  const seatsAfter = after.body?.data?.available_seats;
  if (seatsBefore != null && seatsAfter != null) {
    seatsAfter === seatsBefore - twoNames.length
      ? pass(`kursi berkurang ${twoNames.length} sesuai jumlah penumpang`, `${seatsBefore} -> ${seatsAfter}`)
      : fail(`kursi berkurang ${twoNames.length} sesuai jumlah penumpang`,
          `${seatsBefore} -> ${seatsAfter} (kalau cuma berkurang 1, kemungkinan besar overload lama create_flight_booking(uuid,jsonb) belum di-DROP dan tanpa sadar terpanggil)`);
  }

  const detail = await GET(`/api/flight-bookings/${ctx.flightBookingId}`, { auth: ctx.token });
  expect('GET /api/flight-bookings/:id', detail, 200, (b) => {
    if (b?.data?.id !== ctx.flightBookingId) return 'id tidak cocok';
    if (!Array.isArray(b.data.tickets) || b.data.tickets.length !== twoNames.length) return 'tickets tidak konsisten dengan saat create';
    return true;
  });

  const detailNoAuth = await GET(`/api/flight-bookings/${ctx.flightBookingId}`);
  expect('GET booking tanpa token -> 401', detailNoAuth, 401);

  const fakeId = await GET('/api/flight-bookings/00000000-0000-0000-0000-000000000000', { auth: ctx.token });
  expect('GET booking milik orang lain/tidak ada -> 404', fakeId, 404);

  const list = await GET('/api/flight-bookings', { auth: ctx.token });
  expect('GET /api/flight-bookings (list)', list, 200, (b) =>
    Array.isArray(b?.data) && b.data.some((x) => x.id === ctx.flightBookingId)
      ? true : 'booking yang barusan dibuat tidak muncul di list');

  // ── Tiket: list ringan + detail satu-satu ──
  // Booking masih 'pending' (belum benar-benar dibayar lewat webhook di
  // tes otomatis ini), jadi endpoint tiket HARUS menolak dengan 403 --
  // itu justru yang membuktikan gerbang "tiket baru aktif setelah dibayar"
  // bekerja. Klaim kursi beda ceritanya: itu boleh dilakukan sebelum
  // lunas (lihat RPC claim_flight_seat), jadi dites terpisah di bawah.
  const ticketsList = await GET(`/api/flight-bookings/${ctx.flightBookingId}/tickets`, { auth: ctx.token });
  expect('GET tickets saat booking masih pending -> 403 ticket_not_active', ticketsList, 403, (b) =>
    b?.error === 'ticket_not_active' ? true : `error = ${b?.error}`);

  if (ticketIds[0]) {
    const ticketDetail = await GET(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketIds[0]}`, { auth: ctx.token });
    expect('GET detail tiket saat pending -> 403', ticketDetail, 403);
  }

  const ticketsNoAuth = await GET(`/api/flight-bookings/${ctx.flightBookingId}/tickets`);
  expect('GET tickets tanpa token -> 401', ticketsNoAuth, 401);

  // ── Kursi: klaim, ganti, cek konflik ──
  if (ticketIds.length < 2) {
    skip('semua tes klaim kursi', 'tidak dapat 2 ticket_id dari booking');
  } else {
    const [ticketA, ticketB] = ticketIds;

    const emptySeat = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketA}/seat`, {
      body: { seat_number: '' }, auth: ctx.token,
    });
    expect('klaim kursi seat_number kosong -> 400', emptySeat, 400);

    const fakeTicketSeat = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/00000000-0000-0000-0000-000000000000/seat`, {
      body: { seat_number: '1A' }, auth: ctx.token,
    });
    expect('klaim kursi utk ticket_id tidak ada -> 404', fakeTicketSeat, 404);

    const claimA = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketA}/seat`, {
      body: { seat_number: '1A' }, auth: ctx.token,
    });
    expect('POST klaim kursi 1A untuk tiket A', claimA, 201, (b) =>
      b?.data?.seat_number === '1A' ? true : `seat_number = ${b?.data?.seat_number}`);

    // tiket B coba klaim kursi yang SAMA -> harus bentrok
    const conflictB = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketB}/seat`, {
      body: { seat_number: '1A' }, auth: ctx.token,
    });
    expect('tiket B klaim kursi yang sama -> 409 seat_taken', conflictB, 409);

    // ganti kursi tiket A ke nomor lain -- harus sukses, dan 1A jadi bebas lagi
    const changeA = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketA}/seat`, {
      body: { seat_number: '2B' }, auth: ctx.token,
    });
    expect('ganti kursi tiket A ke 2B', changeA, 201, (b) =>
      b?.data?.seat_number === '2B' ? true : `seat_number = ${b?.data?.seat_number}`);

    // sekarang tiket B coba klaim 1A (bekas tiket A) -- harus sukses karena sudah dilepas
    const claimB = await POST(`/api/flight-bookings/${ctx.flightBookingId}/tickets/${ticketB}/seat`, {
      body: { seat_number: '1A' }, auth: ctx.token,
    });
    expect('tiket B klaim 1A setelah dilepas tiket A -> sukses', claimB, 201, (b) =>
      b?.data?.seat_number === '1A' ? true : `seat_number = ${b?.data?.seat_number}`);

    // GET /api/flights/:id/seats harus menunjukkan kedua kursi yang aktif sekarang
    const takenSeats = await GET(`/api/flights/${ctx.flight.id}/seats`);
    expect('GET /api/flights/:id/seats', takenSeats, 200, (b) => {
      if (!Array.isArray(b?.taken_seats)) return 'taken_seats bukan array';
      if (!b.taken_seats.includes('2B')) return '2B (kursi tiket A sekarang) tidak muncul di taken_seats';
      if (!b.taken_seats.includes('1A')) return '1A (kursi tiket B sekarang) tidak muncul di taken_seats';
      return true;
    });
  }

  const pay = await POST(`/api/flight-bookings/${ctx.flightBookingId}/pay`, { auth: ctx.token });
  if (pay.status === 502) {
    fail('POST /flight-bookings/:id/pay', 'Xendit tidak bisa dihubungi (502) — cek XENDIT_SECRET_KEY di .env');
  } else if (expect('POST /flight-bookings/:id/pay', pay, 201, (b) =>
    b?.data?.invoice_url ? true : 'invoice_url tidak ada')) {
    note(`invoice: ${pay.body.data.invoice_url}`);

    const payAgain = await POST(`/api/flight-bookings/${ctx.flightBookingId}/pay`, { auth: ctx.token });
    expect('pay kedua kali -> invoice lama dipakai ulang (200, reused:true)', payAgain, 200, (b) =>
      b?.data?.reused === true ? true : `reused = ${b?.data?.reused}`);
  }

  const cancel = await POST(`/api/flight-bookings/${ctx.flightBookingId}/cancel`, { auth: ctx.token });
  if (expect('POST /flight-bookings/:id/cancel', cancel, 200)) {
    const afterCancel = await GET(`/api/flights/${ctx.flight.id}`);
    const seatsBack = afterCancel.body?.data?.available_seats;
    seatsBack === seatsBefore
      ? pass(`kursi kembali penuh (${twoNames.length} kursi) setelah cancel`, `${seatsAfter} -> ${seatsBack}`)
      : fail(`kursi kembali penuh (${twoNames.length} kursi) setelah cancel`,
          `${seatsAfter} -> ${seatsBack}, harusnya ${seatsBefore} (cek settle_booking: refund pakai quantity per item, bukan flat +1)`);

    // Kursi spesifik yang diklaim tadi (1A/2B) juga harus lepas setelah cancel
    if (ticketIds.length >= 2) {
      const seatsAfterCancel = await GET(`/api/flights/${ctx.flight.id}/seats`);
      const stillTaken = (seatsAfterCancel.body?.taken_seats || []).some((s) => s === '1A' || s === '2B');
      !stillTaken
        ? pass('kursi 1A/2B ikut lepas setelah booking dibatalkan')
        : fail('kursi 1A/2B ikut lepas setelah booking dibatalkan', `taken_seats masih: ${seatsAfterCancel.body?.taken_seats?.join(', ')}`);
    }

    ctx.flightBookingId = null; // sudah dibatalkan
  }
}

// ═════════════════════════════════════════════════════════════
// 14. BOOKING AKOMODASI (multi-kamar: rooms array + availability check)
// ═════════════════════════════════════════════════════════════
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function testAccommodationBookings() {
  section('14. Booking akomodasi (multi-kamar)');

  if (!CONFIG.RUN_BOOKING) return skip('semua tes booking akomodasi', 'TEST_BOOKING=0');
  if (!ctx.accommodationId) return skip('semua tes booking akomodasi', 'tidak dapat id akomodasi');

  const checkIn = dateOffset(20);
  const checkOut = dateOffset(23);

  const availBadQuery = await GET(`/api/accommodations/${ctx.accommodationId}/availability`);
  expect('GET availability tanpa tanggal -> 400', availBadQuery, 400);

  const availBefore = await GET(`/api/accommodations/${ctx.accommodationId}/availability`, {
    query: { check_in: checkIn, check_out: checkOut },
  });
  const availOk = expect('GET availability (sebelum booking)', availBefore, 200, (b) => {
    if (typeof b?.data?.room_count !== 'number') return 'room_count tidak ada';
    if (typeof b?.data?.available !== 'number') return 'available tidak ada';
    return true;
  });

  const roomCount = availOk ? availBefore.body.data.room_count : null;
  const availableBefore = availOk ? availBefore.body.data.available : null;
  if (availOk) note(`room_count=${roomCount}, available=${availableBefore} untuk ${checkIn}..${checkOut}`);

  const noAuth = await POST('/api/accommodation-bookings', { body: {} });
  expect('POST /api/accommodation-bookings tanpa token -> 401', noAuth, 401);

  const noAccId = await POST('/api/accommodation-bookings', {
    body: { rooms: [{ check_in: checkIn, check_out: checkOut, guests: 2 }] },
    auth: ctx.token,
  });
  expect('tanpa accommodation_id -> 400', noAccId, 400);

  const noRooms = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId },
    auth: ctx.token,
  });
  expect('tanpa rooms -> 400', noRooms, 400);

  const emptyRooms = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId, rooms: [] },
    auth: ctx.token,
  });
  expect('rooms array kosong -> 400', emptyRooms, 400);

  const badFormat = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId, rooms: [{ check_in: '10-09-2026', check_out: '13-09-2026' }] },
    auth: ctx.token,
  });
  expect('format tanggal salah -> 400 invalid_date', badFormat, 400);

  const pastDate = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId, rooms: [{ check_in: dateOffset(-10), check_out: dateOffset(-8) }] },
    auth: ctx.token,
  });
  expect('check_in di masa lalu -> 400', pastDate, [400, 409]);

  const reversed = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId, rooms: [{ check_in: dateOffset(10), check_out: dateOffset(7) }] },
    auth: ctx.token,
  });
  expect('check_out sebelum check_in -> 400', reversed, [400, 409]);

  const tooManyGuests = await POST('/api/accommodation-bookings', {
    body: { accommodation_id: ctx.accommodationId, rooms: [{ check_in: checkIn, check_out: checkOut, guests: 999 }] },
    auth: ctx.token,
  });
  expect('guests 999 -> 400 exceeds_max_guests', tooManyGuests, [400, 409]);

  const tooManyRooms = await POST('/api/accommodation-bookings', {
    body: {
      accommodation_id: ctx.accommodationId,
      rooms: Array.from({ length: 6 }, () => ({ check_in: checkIn, check_out: checkOut, guests: 1 })),
    },
    auth: ctx.token,
  });
  expect('6 kamar sekaligus -> 400 too_many_rooms (batas 5)', tooManyRooms, [400, 409]);

  const create = await POST('/api/accommodation-bookings', {
    body: {
      accommodation_id: ctx.accommodationId,
      rooms: [
        { check_in: checkIn, check_out: checkOut, guests: 2 },
        { check_in: checkIn, check_out: checkOut, guests: 2 },
      ],
    },
    auth: ctx.token,
  });

  const created = expect('POST /api/accommodation-bookings (2 kamar)', create, 201, (b) => {
    if (!b?.data?.id) return 'data.id tidak ada';
    if (!b.data.booking_code) return 'booking_code tidak ada';
    if (b.data.payment_status !== 'pending') return `payment_status = ${b.data.payment_status}`;
    const rooms = b.data.accommodation_booking_rooms;
    if (!Array.isArray(rooms) || rooms.length !== 2) return `accommodation_booking_rooms.length = ${rooms?.length}, harusnya 2`;
    const names = rooms.map((r) => r.room_name);
    if (new Set(names).size !== 2) return `nama kamar tidak unik dalam 1 booking: ${names.join(', ')}`;
    const sumSubtotal = rooms.reduce((s, r) => s + Number(r.subtotal), 0);
    if (Math.abs(sumSubtotal - Number(b.data.total_price)) > 0.01) {
      return `total_price (${b.data.total_price}) != jumlah subtotal tiap kamar (${sumSubtotal})`;
    }
    return true;
  });

  if (!created) return;
  ctx.accBookingId = create.body.data.id;
  const roomNames = create.body.data.accommodation_booking_rooms.map((r) => r.room_name);
  note(`booking_code: ${create.body.data.booking_code}, kamar: ${roomNames.join(', ')}, total Rp${create.body.data.total_price}`);

  if (availOk) {
    const availAfter = await GET(`/api/accommodations/${ctx.accommodationId}/availability`, {
      query: { check_in: checkIn, check_out: checkOut },
    });
    const availableAfter = availAfter.body?.data?.available;
    availableAfter === availableBefore - 2
      ? pass('availability berkurang tepat 2 setelah booking 2 kamar', `${availableBefore} -> ${availableAfter}`)
      : fail('availability berkurang tepat 2 setelah booking 2 kamar', `${availableBefore} -> ${availableAfter}`);
  }

  if (availOk && roomCount != null && availableBefore - 2 >= 0 && availableBefore - 2 <= 5) {
    const remaining = availableBefore - 2;
    if (remaining === 0) {
      const overbook = await POST('/api/accommodation-bookings', {
        body: { accommodation_id: ctx.accommodationId, rooms: [{ check_in: checkIn, check_out: checkOut, guests: 1 }] },
        auth: ctx.token,
      });
      expect('booking saat kapasitas 0 -> 409 no_rooms_available', overbook, 409);
    } else {
      note(`sisa kapasitas ${remaining} kamar untuk tanggal ini -- tidak menghabiskan semuanya supaya tidak mengganggu run test lain`);
    }
  }

  const detail = await GET(`/api/accommodation-bookings/${ctx.accBookingId}`, { auth: ctx.token });
  expect('GET /api/accommodation-bookings/:id', detail, 200, (b) => {
    const rooms = b?.data?.accommodation_booking_rooms;
    if (!Array.isArray(rooms) || rooms.length !== 2) return 'accommodation_booking_rooms tidak konsisten dengan saat create';
    if (!rooms[0]?.accommodations) return 'relasi accommodations tidak ikut ter-embed di tiap kamar';
    return true;
  });

  const detailNoAuth = await GET(`/api/accommodation-bookings/${ctx.accBookingId}`);
  expect('GET booking tanpa token -> 401', detailNoAuth, 401);

  const list = await GET('/api/accommodation-bookings', { auth: ctx.token });
  expect('GET /api/accommodation-bookings (list)', list, 200, (b) =>
    Array.isArray(b?.data) && b.data.some((x) => x.id === ctx.accBookingId)
      ? true : 'booking barusan tidak muncul di list');

  const pay = await POST(`/api/accommodation-bookings/${ctx.accBookingId}/pay`, { auth: ctx.token });
  if (pay.status === 502) {
    fail('POST /accommodation-bookings/:id/pay', 'Xendit 502 — cek XENDIT_SECRET_KEY');
  } else {
    expect('POST /accommodation-bookings/:id/pay', pay, 201, (b) =>
      b?.data?.invoice_url ? true : 'invoice_url tidak ada');
  }

  const cancel = await POST(`/api/accommodation-bookings/${ctx.accBookingId}/cancel`, { auth: ctx.token });
  if (expect('POST /accommodation-bookings/:id/cancel', cancel, 200)) {
    ctx.accBookingId = null;

    const afterCancel = await GET(`/api/accommodation-bookings/${create.body.data.id}`, { auth: ctx.token });
    const status = afterCancel.body?.data?.payment_status;
    status && status !== 'pending'
      ? pass('status booking berubah setelah cancel', `payment_status = ${status}`)
      : fail('status booking berubah setelah cancel', `payment_status masih ${status}`);

    if (availOk) {
      const availRestored = await GET(`/api/accommodations/${ctx.accommodationId}/availability`, {
        query: { check_in: checkIn, check_out: checkOut },
      });
      const restored = availRestored.body?.data?.available;
      restored === availableBefore
        ? pass('availability kembali penuh setelah cancel (tanpa refund manual)', `available = ${restored}`)
        : fail('availability kembali penuh setelah cancel', `available = ${restored}, harusnya ${availableBefore}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════
// 15. RUTE PETA (OpenRouteService, nol AI)
// ═════════════════════════════════════════════════════════════
async function testRoute() {
  section('15. Rute peta (GET /api/route)');

  const badQuery = await GET('/api/route');
  expect('GET /api/route tanpa koordinat -> 400', badQuery, 400);

  const nonNumeric = await GET('/api/route', {
    query: { from_lat: 'abc', from_lng: '106', to_lat: '-8', to_lng: '115' },
  });
  expect('koordinat bukan angka -> 400', nonNumeric, 400);

  if (ctx.destinationLat == null || ctx.accommodationLat == null) {
    return skip('rute jalan darat destinasi -> akomodasi', 'tidak dapat koordinat destinasi/akomodasi dari section sebelumnya');
  }

  const route = await GET('/api/route', {
    query: {
      from_lat: ctx.destinationLat, from_lng: ctx.destinationLng,
      to_lat: ctx.accommodationLat, to_lng: ctx.accommodationLng,
    },
  });

  expect('GET /api/route (destinasi -> akomodasi terdekat)', route, 200, (b) => {
    if (typeof b?.data?.routable !== 'boolean') return 'data.routable tidak ada';
    if (b.data.routable && !Array.isArray(b.data.geometry)) return 'routable true tapi geometry bukan array';
    return true;
  });

  if (route.body?.data?.routable) {
    note(`${route.body.data.distance_km} km, ~${route.body.data.duration_minutes} menit, ${route.body.data.geometry?.length} titik geometri`);
  } else {
    note(`tidak routable: ${route.body?.data?.message || '(tanpa pesan)'} — wajar kalau memang beda pulau/tidak ada jalur darat`);
  }
}

// ═════════════════════════════════════════════════════════════
// 15b. TRIP — pembuatan langsung (POST /api/trips)
// ═════════════════════════════════════════════════════════════
// Trip biasanya dibuat implisit lewat POST /api/chat/rooms (lihat section 16),
// tapi sekarang ada juga endpoint pembuatan langsung tanpa lewat chat.
async function testTripCreate() {
  section('15b. Trip — pembuatan langsung (POST /api/trips)');

  const noAuth = await POST('/api/trips', { body: { name: 'Trip tanpa token' } });
  expect('POST /api/trips tanpa token -> 401', noAuth, 401);

  const minimal = await POST('/api/trips', { body: {}, auth: ctx.token });
  const minimalOk = expect('POST /api/trips (body kosong -> default travelers=1)', minimal, 201, (b) => {
    if (!b?.data?.id) return 'data.id tidak ada';
    if (b.data.travelers !== 1) return `travelers = ${b.data.travelers}, harusnya default 1`;
    if (b.data.status !== 'planning') return `status = ${b.data.status}, harusnya planning`;
    return true;
  });
  if (minimalOk) {
    note(`trip kosong ${minimal.body.data.id} dibuat cuma buat verifikasi validasi -- tidak dihapus (belum ada DELETE /api/trips/:id), akan tersisa di database`);
  }

  const full = await POST('/api/trips', {
    body: {
      name: 'Jelajah Sumatera Utara',
      start_date: '2026-11-10',
      end_date: '2026-11-17',
      travelers: 2,
      origin_city_id: ctx.destinationCityId || undefined,
    },
    auth: ctx.token,
  });
  const fullOk = expect('POST /api/trips (field lengkap)', full, 201, (b) => {
    if (b?.data?.name !== 'Jelajah Sumatera Utara') return `name = ${b?.data?.name}`;
    if (b?.data?.start_date !== '2026-11-10') return `start_date = ${b?.data?.start_date}`;
    if (b?.data?.travelers !== 2) return `travelers = ${b?.data?.travelers}`;
    return true;
  });
  if (fullOk) {
    note(`trip dibuat: ${full.body.data.id}`);

    const listAfter = await GET('/api/trips', { auth: ctx.token });
    const found = (listAfter.body?.data || []).some((t) => t.id === full.body.data.id);
    found
      ? pass('trip baru muncul di GET /api/trips')
      : fail('trip baru muncul di GET /api/trips', 'tidak ditemukan di daftar trip milik user');

    note(`trip ${full.body.data.id} juga tidak dihapus (belum ada DELETE /api/trips/:id) -- akan tersisa di database`);
  }

  const badDate = await POST('/api/trips', {
    body: { start_date: '10-11-2026' }, auth: ctx.token,
  });
  expect('POST /api/trips start_date format salah -> 400', badDate, 400, (b) =>
    b?.error === 'invalid_date' ? true : `error = ${b?.error}`);

  const badRange = await POST('/api/trips', {
    body: { start_date: '2026-11-17', end_date: '2026-11-10' }, auth: ctx.token,
  });
  expect('POST /api/trips end_date sebelum start_date -> 400', badRange, 400, (b) =>
    b?.error === 'invalid_date_range' ? true : `error = ${b?.error}`);

  const badTravelers = await POST('/api/trips', {
    body: { travelers: 0 }, auth: ctx.token,
  });
  expect('POST /api/trips travelers=0 -> 400', badTravelers, 400, (b) =>
    b?.error === 'invalid_travelers' ? true : `error = ${b?.error}`);
}

// ═════════════════════════════════════════════════════════════
// 16. TRIP — panel kontrol langsung (non-AI)
// ═════════════════════════════════════════════════════════════
// Struktur canvas sekarang berjenjang: trip -> stops[] (satu per kota) ->
// tiap stop punya trip_items[] (destinasi), accommodations, dan
// trip_flights[] (arrival/departure). Ini beda total dari versi lama yang
// flat (canvas.items / canvas.flights).
async function testTripDirect() {
  section('16. Trip — panel langsung (non-AI)');

  const noAuthRoom = await POST('/api/chat/rooms');
  expect('POST /api/chat/rooms tanpa token -> 401', noAuthRoom, 401);

  const createRoom = await POST('/api/chat/rooms', { auth: ctx.token });
  if (!expect('POST /api/chat/rooms', createRoom, 201, (b) =>
    b?.data?.id && b?.data?.trip_id ? true : 'id atau trip_id tidak ada')) {
    return skip('semua tes trip & AI chat', 'gagal membuat room+trip');
  }
  ctx.roomId = createRoom.body.data.id;
  ctx.tripId = createRoom.body.data.trip_id;
  note(`room: ${ctx.roomId}, trip: ${ctx.tripId}`);

  const getCanvas = await GET(`/api/trips/${ctx.tripId}`, { auth: ctx.token });
  expect('GET /api/trips/:id (canvas awal kosong)', getCanvas, 200, (b) => {
    if (!b?.data?.trip) return 'data.trip tidak ada';
    if (!Array.isArray(b.data.stops) || b.data.stops.length !== 0) return 'stops harusnya kosong di trip baru';
    return true;
  });

  const getCanvasNoAuth = await GET(`/api/trips/${ctx.tripId}`);
  expect('GET /api/trips/:id tanpa token -> 401', getCanvasNoAuth, 401);

  const getFakeTrip = await GET('/api/trips/00000000-0000-0000-0000-000000000000', { auth: ctx.token });
  expect('GET trip tidak ada/bukan milik user -> 404', getFakeTrip, 404);

  // travelers sengaja dipatok 1 (bukan angka lebih besar) -- akomodasi yang
  // dipilih otomatis nanti (ctx.accommodationId, akomodasi pertama dari
  // destinasi) bisa punya max_guests serendah 2 (default skema), jadi
  // travelers > 1 bikin checkout di bawah gagal EXCEEDS_MAX_GUESTS alih-alih
  // nothing_to_book yang justru mau dites di situ.
  const patchTrip = await PATCH_(`/api/trips/${ctx.tripId}`, { body: { travelers: 1 }, auth: ctx.token });
  expect('PATCH /api/trips/:id (ubah travelers)', patchTrip, 200, (b) =>
    b?.data?.trip?.travelers === 1 ? true : `travelers = ${b?.data?.trip?.travelers}`);

  const patchBadDate = await PATCH_(`/api/trips/${ctx.tripId}`, {
    body: { start_date: '2026-09-05', end_date: '2026-09-01' }, auth: ctx.token,
  });
  expect('PATCH end_date sebelum start_date -> 400', patchBadDate, 400);

  if (!ctx.destinationId || !ctx.destinationCityId) return skip('sisa tes trip stops/items', 'tidak dapat destinationId/destinationCityId');

  // ── STOPS ──────────────────────────────────────────────────
  const stopNoCityId = await POST(`/api/trips/${ctx.tripId}/stops`, { body: {}, auth: ctx.token });
  expect('POST stops tanpa city_id -> 400', stopNoCityId, 400);

  const stopFakeCity = await POST(`/api/trips/${ctx.tripId}/stops`, {
    body: { city_id: 999999 }, auth: ctx.token,
  });
  expect('POST stops city_id tidak ada -> 404', stopFakeCity, 404);

  const addStop = await POST(`/api/trips/${ctx.tripId}/stops`, {
    body: { city_id: ctx.destinationCityId }, auth: ctx.token,
  });
  if (!expect('POST /api/trips/:id/stops (buat stop pertama)', addStop, 201, (b) =>
    b?.stop_id ? true : 'stop_id tidak ada')) {
    return skip('sisa tes trip stops/items', 'gagal membuat stop pertama');
  }
  ctx.tripStopId = addStop.body.stop_id;
  note(`stop dibuat: ${ctx.tripStopId} untuk city_id=${ctx.destinationCityId}`);

  const addStopAgain = await POST(`/api/trips/${ctx.tripId}/stops`, {
    body: { city_id: ctx.destinationCityId }, auth: ctx.token,
  });
  expect('POST stop kota yang sama lagi -> reuse (200, already_in_trip)', addStopAgain, 200, (b) =>
    b?.stop_id === ctx.tripStopId && b?.already_in_trip === true
      ? true : `stop_id = ${b?.stop_id}, already_in_trip = ${b?.already_in_trip}`);

  const addStopForceNew = await POST(`/api/trips/${ctx.tripId}/stops`, {
    body: { city_id: ctx.destinationCityId, force_new: true }, auth: ctx.token,
  });
  const forceNewOk = expect('POST stop kota sama dengan force_new -> stop baru', addStopForceNew, 201, (b) =>
    b?.stop_id && b.stop_id !== ctx.tripStopId ? true : 'stop_id sama dengan yang lama, force_new tidak jalan');
  const extraStopId = forceNewOk ? addStopForceNew.body.stop_id : null;

  const reorderStopsBad = await PUT(`/api/trips/${ctx.tripId}/stops/order`, {
    body: { ordered_stop_ids: [] }, auth: ctx.token,
  });
  expect('PUT stops/order kosong -> 400', reorderStopsBad, 400);

  if (extraStopId) {
    const reorderStops = await PUT(`/api/trips/${ctx.tripId}/stops/order`, {
      body: { ordered_stop_ids: [extraStopId, ctx.tripStopId] }, auth: ctx.token,
    });
    expect('PUT /api/trips/:id/stops/order', reorderStops, 200, (b) =>
      typeof b?.reordered === 'number' ? true : 'field reordered tidak ada');

    // buang stop ekstra ini lagi supaya tidak mengganggu tes berikutnya
    const removeExtra = await DEL(`/api/trips/${ctx.tripId}/stops/${extraStopId}`, { auth: ctx.token });
    expect('DELETE stop ekstra (bersihkan)', removeExtra, 200);
  }

  // ── ITEMS (destinasi di dalam stop) ─────────────────────────
  const noBody = await POST(`/api/trips/${ctx.tripId}/items`, { body: {}, auth: ctx.token });
  expect('POST items tanpa destination_id -> 400', noBody, 400);

  const addItem = await POST(`/api/trips/${ctx.tripId}/items`, {
    body: { destination_id: ctx.destinationId }, auth: ctx.token,
  });
  const addItemOk = expect('POST /api/trips/:id/items (tambah destinasi, auto-resolve stop)', addItem, [200, 201], (b) => {
    const stop = (b?.data?.stops || []).find((s) => s.id === b.stop_id);
    if (!stop) return 'stop_id di response tidak ketemu di canvas.stops';
    const item = (stop.trip_items || []).find((i) => i.destinations?.id === ctx.destinationId);
    return item ? true : 'destinasi tidak muncul di trip_items stop tersebut';
  });

  if (addItemOk) {
    if (addItem.body.stop_id !== ctx.tripStopId) {
      fail('destinasi masuk ke stop yang sudah ada (bukan stop baru)', `stop_id = ${addItem.body.stop_id}, harusnya ${ctx.tripStopId}`);
    } else {
      pass('destinasi otomatis masuk ke stop kota yang sudah ada (tidak duplikat stop)');
    }
    const stop = addItem.body.data.stops.find((s) => s.id === addItem.body.stop_id);
    const item = stop.trip_items.find((i) => i.destinations?.id === ctx.destinationId);
    ctx.tripItemId = item.id;
    (item.added_by === 'user')
      ? pass('item ditandai added_by=user (bukan lewat AI)')
      : fail('item ditandai added_by=user', `added_by = ${item.added_by}`);
  }

  const addAgain = await POST(`/api/trips/${ctx.tripId}/items`, {
    body: { destination_id: ctx.destinationId }, auth: ctx.token,
  });
  expect('POST destinasi yang sama dua kali -> tidak duplikat', addAgain, [200, 201], (b) => {
    const stop = (b?.data?.stops || []).find((s) => s.id === ctx.tripStopId);
    const count = (stop?.trip_items || []).filter((i) => i.destinations?.id === ctx.destinationId).length;
    return count === 1 ? true : `destinasi muncul ${count}x di trip_items, harusnya 1`;
  });

  if (ctx.tripItemId) {
    // accommodation_id/check_in/check_out SUDAH TIDAK diterima di endpoint
    // item -- field itu sekarang milik stop. Ini yang mengonfirmasi
    // penolakannya, bukan lagi tersimpan di item.
    const rejectedFields = await PATCH_(`/api/trips/${ctx.tripId}/items/${ctx.tripItemId}`, {
      body: { accommodation_id: ctx.accommodationId, check_in: '2026-09-01', check_out: '2026-09-03' },
      auth: ctx.token,
    });
    expect('PATCH item dengan accommodation_id/check_in/check_out -> 400 moved_to_stop', rejectedFields, 400, (b) =>
      b?.error === 'moved_to_stop' ? true : `error = ${b?.error}`);

    const badGuests = await PATCH_(`/api/trips/${ctx.tripId}/items/${ctx.tripItemId}`, {
      body: { guests: 0 }, auth: ctx.token,
    });
    expect('PATCH item guests=0 -> 400', badGuests, 400);

    const confirmItem = await PATCH_(`/api/trips/${ctx.tripId}/items/${ctx.tripItemId}`, {
      body: { status: 'confirmed' }, auth: ctx.token,
    });
    expect('PATCH item status=confirmed', confirmItem, 200, (b) => {
      const stop = (b?.data?.stops || []).find((s) => s.id === ctx.tripStopId);
      const item = stop?.trip_items?.find((i) => i.id === ctx.tripItemId);
      return item?.status === 'confirmed' ? true : `status = ${item?.status}`;
    });

    const reorderItemsBad = await PUT(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/items/order`, {
      body: { ordered_item_ids: [] }, auth: ctx.token,
    });
    expect('PUT stops/:stopId/items/order kosong -> 400', reorderItemsBad, 400);

    const reorderItems = await PUT(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/items/order`, {
      body: { ordered_item_ids: [ctx.tripItemId] }, auth: ctx.token,
    });
    expect('PUT stops/:stopId/items/order', reorderItems, 200, (b) =>
      typeof b?.reordered === 'number' ? true : 'field reordered tidak ada');
  }

  // ── AKOMODASI (sekarang milik STOP, bukan item) ─────────────
  if (ctx.accommodationId) {
    const setAccWrongCity = await PATCH_(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}`, {
      body: { accommodation_id: '00000000-0000-0000-0000-000000000000' }, auth: ctx.token,
    });
    expect('PATCH stop dengan accommodation_id ngawur -> 404', setAccWrongCity, 404);

    const setAcc = await PATCH_(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}`, {
      body: { accommodation_id: ctx.accommodationId, check_in: dateOffset(30), check_out: dateOffset(33) },
      auth: ctx.token,
    });
    const setAccOk = expect('PATCH stop pilih akomodasi + tanggal', setAcc, 200, (b) => {
      const stop = (b?.data?.stops || []).find((s) => s.id === ctx.tripStopId);
      if (stop?.accommodations?.id !== ctx.accommodationId) return 'accommodation_id tidak tersimpan di stop';
      if (stop?.accommodation_status !== 'pending') return `accommodation_status = ${stop?.accommodation_status}, harusnya pending (dipilih lewat endpoint REST)`;
      return true;
    });

    if (setAccOk) {
      pass('accommodation_status = pending saat dipilih lewat endpoint REST (bukan AI)');
    }

    const badRange = await PATCH_(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}`, {
      body: { check_out: dateOffset(29) }, auth: ctx.token,
    });
    expect('PATCH stop check_out sebelum check_in -> 400', badRange, 400);
  } else {
    skip('tes akomodasi per stop', 'tidak dapat accommodationId');
  }

  // ── PENERBANGAN (sekarang per stop, arrival/departure) ──────
  if (ctx.flight?.id) {
    const badRole = await PUT(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/flights`, {
      body: { flight_option_id: ctx.flight.id, flight_role: 'pulang-pergi' }, auth: ctx.token,
    });
    expect('PUT stop flights, flight_role ngawur -> 400', badRole, 400);

    const setFlight = await PUT(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/flights`, {
      body: { flight_option_id: ctx.flight.id, flight_role: 'arrival' }, auth: ctx.token,
    });
    const setFlightOk = expect('PUT /api/trips/:id/stops/:stopId/flights (pilih arrival)', setFlight, 200, (b) => {
      const stop = (b?.data?.stops || []).find((s) => s.id === ctx.tripStopId);
      const leg = (stop?.trip_flights || []).find((f) => f.flight_role === 'arrival');
      if (!leg) return 'arrival tidak muncul di trip_flights stop tersebut';
      if (leg.confirmed !== true) return `confirmed = ${leg.confirmed}, harusnya true (dipilih lewat endpoint REST)`;
      return true;
    });
    setFlightOk && pass('confirmed = true saat penerbangan dipilih lewat endpoint REST (bukan AI)');

    const dropFlight = await DEL(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/flights/arrival`, { auth: ctx.token });
    expect('DELETE /api/trips/:id/stops/:stopId/flights/arrival', dropFlight, 200, (b) => {
      const stop = (b?.data?.stops || []).find((s) => s.id === ctx.tripStopId);
      return !(stop?.trip_flights || []).some((f) => f.flight_role === 'arrival')
        ? true : 'arrival masih ada setelah dihapus';
    });

    const dropFakeRole = await DEL(`/api/trips/${ctx.tripId}/stops/${ctx.tripStopId}/flights/departure`, { auth: ctx.token });
    expect('DELETE flight role yang belum pernah dipilih -> 404', dropFakeRole, 404);
  } else {
    skip('tes penerbangan per stop', 'tidak dapat ctx.flight');
  }

  // ── CHECKOUT tanpa apa pun yang confirmed/pending -> nothing_to_book ──
  const checkoutEmpty = await POST(`/api/trips/${ctx.tripId}/checkout`, { auth: ctx.token });
  expect('POST /api/trips/:id/checkout sebelum ada yang disetujui -> 400 nothing_to_book', checkoutEmpty, 400, (b) =>
    b?.error === 'nothing_to_book' ? true : `error = ${b?.error}`);

  // ── Bersih-bersih supaya tidak mengganggu section berikutnya ──
  if (ctx.tripItemId) {
    const removeItem = await DEL(`/api/trips/${ctx.tripId}/items/${ctx.tripItemId}`, { auth: ctx.token });
    expect('DELETE /api/trips/:id/items/:itemId (bersihkan)', removeItem, 200);
    ctx.tripItemId = null;
  }
}
// ═════════════════════════════════════════════════════════════
// 17. AI TRIP PLANNER (chat) -- checkout PINDAH ke /api/trips/:id/checkout
// ═════════════════════════════════════════════════════════════
// Satu-satunya beda dari versi lama: dua expect() di paling bawah yang
// mengetes checkout, dulu memanggil POST /api/chat/rooms/:id/checkout,
// sekarang memanggil POST /api/trips/:id/checkout langsung -- checkout
// bukan lagi urusan chat room. Sisa fungsi ini (moderasi, kirim pesan,
// riwayat) tidak berubah sama sekali.
async function testAiChat() {
  section('17. AI Trip Planner (chat)');

  if (!CONFIG.RUN_AI_CHAT) return skip('semua tes AI chat', 'TEST_AI_CHAT=0');
  if (!ctx.roomId) return skip('semua tes AI chat', 'room belum dibuat di section 16');

  const listRooms = await GET('/api/chat/rooms', { auth: ctx.token });
  expect('GET /api/chat/rooms', listRooms, 200, (b) =>
    Array.isArray(b?.data) && b.data.some((r) => r.id === ctx.roomId)
      ? true : 'room yang baru dibuat tidak muncul di list');

  const getRoomBefore = await GET(`/api/chat/rooms/${ctx.roomId}`, { auth: ctx.token });
  expect('GET /api/chat/rooms/:id (sebelum ada pesan)', getRoomBefore, 200, (b) =>
    Array.isArray(b?.data?.messages) && b.data.messages.length === 0 ? true : 'messages harusnya kosong');

  const offTopic = await POST(`/api/chat/rooms/${ctx.roomId}/messages`, {
    body: { message: 'tolong tulisin aku kode python buat bubble sort' },
    auth: ctx.token,
  });
  expect('pesan di luar topik -> ditolak gerbang moderasi', offTopic, 200, (b) => {
    if (!b?.data?.answer) return 'answer tidak ada';
    if ((b.data.tools_used || []).length > 0) return 'tools_used tidak kosong, harusnya ditolak sebelum agent loop jalan';
    return true;
  });

  const emptyMsg = await POST(`/api/chat/rooms/${ctx.roomId}/messages`, { body: { message: '' }, auth: ctx.token });
  expect('pesan kosong -> 400', emptyMsg, 400);

  const noAuthMsg = await POST(`/api/chat/rooms/${ctx.roomId}/messages`, { body: { message: 'halo' } });
  expect('kirim pesan tanpa token -> 401', noAuthMsg, 401);

  const started = Date.now();
  const realMsg = await POST(`/api/chat/rooms/${ctx.roomId}/messages`, {
    body: { message: `Aku mau liburan santai ke ${ctx.destinationName || 'Bali'}, ada saran destinasi alam?` },
    auth: ctx.token,
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const ok = expect('POST pesan travel sungguhan', realMsg, 200, (b) => {
    if (!b?.data?.answer) return 'answer tidak ada';
    if (!Array.isArray(b.data.tools_used)) return 'tools_used bukan array';
    if (!Array.isArray(b.data.interactive)) return 'interactive bukan array';
    return true;
  });

  if (ok) {
    const { tools_used, interactive, canvas } = realMsg.body.data;
    note(`${elapsed}s, tool dipakai: ${tools_used.join(', ') || '(tidak ada)'}`);

    tools_used.includes('list_cities')
      ? fail('tidak memanggil list_cities', 'daftar kota mestinya sudah tersedia di prompt sistem, tidak perlu tool ini')
      : pass('tidak memanggil list_cities (daftar kota sudah di prompt)');

    if (interactive.length > 0) {
      note(`${interactive.length} blok kartu interaktif: ${interactive.map((b) => b.type).join(', ')}`);
      const destBlock = interactive.find((b) => b.type === 'destination');
      if (destBlock) {
        const namesInAnswer = destBlock.options.every((d) =>
          realMsg.body.data.answer.toLowerCase().includes(d.name.toLowerCase().split(' ')[0]));
        namesInAnswer
          ? pass('kartu destinasi cocok dengan yang disebut di teks jawaban')
          : note('sebagian nama destinasi di kartu tidak persis cocok kata pertamanya dengan teks (bisa false alarm, cek manual)');
      }
    } else {
      note('tidak ada kartu interaktif pada balasan ini (wajar kalau AI belum menyebut destinasi spesifik)');
    }

    if (!canvas) fail('canvas ikut di response', 'field canvas tidak ada');
    if (canvas && !Array.isArray(canvas.stops)) fail('canvas.stops ada dan berbentuk array', `canvas keys: ${Object.keys(canvas || {}).join(', ')}`);
  }

  const getRoomAfter = await GET(`/api/chat/rooms/${ctx.roomId}`, { auth: ctx.token });
  expect('GET /api/chat/rooms/:id setelah kirim pesan (riwayat tersimpan)', getRoomAfter, 200, (b) => {
    const msgs = b?.data?.messages || [];
    if (msgs.length < 4) return `cuma ${msgs.length} pesan tersimpan, harusnya minimal 4 (2 user + 2 assistant)`;
    const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant && lastAssistant.interactive === undefined) {
      return 'pesan assistant tidak punya field interactive setelah reopen — kolom chat_messages.interactive belum kebentuk?';
    }
    return true;
  });

  // ── Checkout SEKARANG lewat /api/trips/:id/checkout, bukan lagi lewat
  // chat room. Trip ini kemungkinan masih belum ada apa pun yang confirmed/
  // pending (chat baru sebatas ngobrol soal destinasi), jadi wajar
  // nothing_to_book -- yang mau dites di sini cuma bahwa checkout TIDAK
  // lagi menerima path lama.
  const checkoutOldPathGone = await POST(`/api/chat/rooms/${ctx.roomId}/checkout`, { auth: ctx.token });
  expect('POST /api/chat/rooms/:id/checkout (path lama) -> 404, sudah dipindah', checkoutOldPathGone, 404);

  const checkoutEmpty = await POST(`/api/trips/${ctx.tripId}/checkout`, { auth: ctx.token });
  expect('POST /api/trips/:id/checkout tanpa yang siap dipesan -> 400', checkoutEmpty, 400, (b) =>
    b?.error === 'nothing_to_book' ? true : `error = ${b?.error}`);

  const checkoutNoAuth = await POST(`/api/trips/${ctx.tripId}/checkout`);
  expect('POST checkout tanpa token -> 401', checkoutNoAuth, 401);
}

// ═════════════════════════════════════════════════════════════
// 17b. TRIP BOOKING END-TO-END (checkout -> pay -> cancel, 1 invoice)
// ═════════════════════════════════════════════════════════════
// Dites terpisah dari section 16/17 supaya trip yang dipakai punya
// akomodasi berstatus 'pending' dan/atau penerbangan 'confirmed' yang
// jelas kondisinya -- bukan sisa state dari eksplorasi chat AI yang tidak
// deterministik.
async function testTripBookingFlow() {
  section('17b. Trip booking end-to-end (1 invoice per trip)');

  if (!CONFIG.RUN_BOOKING) return skip('semua tes trip booking', 'TEST_BOOKING=0');
  if (!ctx.destinationId || !ctx.destinationCityId) return skip('semua tes trip booking', 'tidak dapat destinationId/destinationCityId');

  // Trip baru, terpisah dari yang dipakai section 16, supaya tidak
  // tercampur sisa item/stop yang sudah dihapus di sana.
  const createRoom = await POST('/api/chat/rooms', { auth: ctx.token });
  if (!expect('POST /api/chat/rooms (untuk trip booking)', createRoom, 201)) {
    return skip('semua tes trip booking', 'gagal membuat room+trip baru');
  }
  const bookingRoomId = createRoom.body.data.id;
  const bookingTripId = createRoom.body.data.trip_id;

  const addStop = await POST(`/api/trips/${bookingTripId}/stops`, {
    body: { city_id: ctx.destinationCityId }, auth: ctx.token,
  });
  if (!expect('POST stops (trip booking)', addStop, 201)) {
    return skip('sisa tes trip booking', 'gagal membuat stop');
  }
  const stopId = addStop.body.stop_id;

  const addItem = await POST(`/api/trips/${bookingTripId}/items`, {
    body: { destination_id: ctx.destinationId, stop_id: stopId }, auth: ctx.token,
  });
  if (!expect('POST items (trip booking)', addItem, [200, 201])) {
    return skip('sisa tes trip booking', 'gagal menambah destinasi');
  }
  const stopAfterAdd = addItem.body.data.stops.find((s) => s.id === stopId);
  const itemId = stopAfterAdd?.trip_items?.find((i) => i.destinations?.id === ctx.destinationId)?.id;

  if (itemId) {
    const confirmItem = await PATCH_(`/api/trips/${bookingTripId}/items/${itemId}`, {
      body: { status: 'confirmed' }, auth: ctx.token,
    });
    expect('PATCH item confirmed (trip booking)', confirmItem, 200);
  }

  if (!ctx.accommodationId) {
    return skip('sisa tes trip booking (butuh akomodasi)', 'tidak dapat accommodationId');
  }

  const checkIn = dateOffset(40);
  const checkOut = dateOffset(43);
  const setAcc = await PATCH_(`/api/trips/${bookingTripId}/stops/${stopId}`, {
    body: { accommodation_id: ctx.accommodationId, check_in: checkIn, check_out: checkOut },
    auth: ctx.token,
  });
  const setAccOk = expect('PATCH stop set akomodasi (trip booking) -> status pending', setAcc, 200, (b) => {
    const stop = (b?.data?.stops || []).find((s) => s.id === stopId);
    return stop?.accommodation_status === 'pending' ? true : `accommodation_status = ${stop?.accommodation_status}`;
  });

  if (!setAccOk) return skip('sisa tes trip booking', 'gagal set akomodasi jadi pending');

  // ── Checkout: harus menghasilkan trip_booking dengan accommodation_count >= 1 ──
  const checkout = await POST(`/api/trips/${bookingTripId}/checkout`, { auth: ctx.token });
  const checkoutOk = expect('POST /api/trips/:id/checkout (akomodasi pending, tanpa flight)', checkout, 201, (b) => {
    if (!b?.data?.id) return 'data.id (trip_booking id) tidak ada';
    if (!b.data.booking_code || !b.data.booking_code.startsWith('TRP-')) return `booking_code = ${b.data.booking_code}, harusnya prefix TRP-`;
    if (b.data.accommodation_count !== 1) return `accommodation_count = ${b.data.accommodation_count}, harusnya 1`;
    return true;
  });

  if (!checkoutOk) {
    // Bersihkan stop/item yang sempat dibuat supaya tidak nyampah walau tes gagal
    return skip('sisa tes trip booking (pay/cancel)', 'checkout gagal, lihat FAIL di atas');
  }

  const tripBookingId = checkout.body.data.id;
  note(`trip_booking: ${checkout.body.data.booking_code}, total Rp${checkout.body.data.total_price}`);

  // Checkout kedua kali untuk trip yang sama -> stop sudah 'booked' (bukan
  // 'pending' lagi), jadi tidak ada lagi yang bisa di-checkout ulang.
  const checkoutAgain = await POST(`/api/trips/${bookingTripId}/checkout`, { auth: ctx.token });
  expect('checkout kedua kali (stop sudah diproses) -> 400 nothing_to_book', checkoutAgain, 400, (b) =>
    b?.error === 'nothing_to_book' ? true : `error = ${b?.error}`);

  // ── GET detail trip booking, harus membawa sub-booking akomodasi ──
  const detail = await GET(`/api/trip-bookings/${tripBookingId}`, { auth: ctx.token });
  expect('GET /api/trip-bookings/:id', detail, 200, (b) => {
    if (b?.data?.id !== tripBookingId) return 'id tidak cocok';
    if (!Array.isArray(b.data.accommodation_bookings) || !b.data.accommodation_bookings.length) return 'accommodation_bookings kosong';
    return true;
  });

  const detailNoAuth = await GET(`/api/trip-bookings/${tripBookingId}`);
  expect('GET trip booking tanpa token -> 401', detailNoAuth, 401);

  const fakeDetail = await GET('/api/trip-bookings/00000000-0000-0000-0000-000000000000', { auth: ctx.token });
  expect('GET trip booking milik orang lain/tidak ada -> 404', fakeDetail, 404);

  const list = await GET('/api/trip-bookings', { auth: ctx.token });
  expect('GET /api/trip-bookings (list)', list, 200, (b) =>
    Array.isArray(b?.data) && b.data.some((x) => x.id === tripBookingId)
      ? true : 'trip booking yang barusan dibuat tidak muncul di list');

  // ── Stop harus balik nunjuk ke booking ini (accommodation_booking_id) ──
  const canvasAfterCheckout = await GET(`/api/trips/${bookingTripId}`, { auth: ctx.token });
  const stopAfterCheckout = canvasAfterCheckout.body?.data?.stops?.find((s) => s.id === stopId);
  stopAfterCheckout?.accommodation_booking_id
    ? pass('trip_stops.accommodation_booking_id terisi setelah checkout')
    : fail('trip_stops.accommodation_booking_id terisi setelah checkout', `accommodation_booking_id = ${stopAfterCheckout?.accommodation_booking_id}`);

  // ── Pay: satu invoice untuk seluruh trip booking ──
  const pay = await POST(`/api/trip-bookings/${tripBookingId}/pay`, { auth: ctx.token });
  if (pay.status === 502) {
    fail('POST /trip-bookings/:id/pay', 'Xendit tidak bisa dihubungi (502) — cek XENDIT_SECRET_KEY di .env');
  } else if (expect('POST /trip-bookings/:id/pay', pay, 201, (b) =>
    b?.data?.invoice_url ? true : 'invoice_url tidak ada')) {
    note(`invoice: ${pay.body.data.invoice_url}`);

    const payAgain = await POST(`/api/trip-bookings/${tripBookingId}/pay`, { auth: ctx.token });
    expect('pay kedua kali -> invoice lama dipakai ulang (200, reused:true)', payAgain, 200, (b) =>
      b?.data?.reused === true ? true : `reused = ${b?.data?.reused}`);
  }

  // ── Cancel: harus cascade ke sub-booking + trip_stops kembali 'pending' ──
  const cancel = await POST(`/api/trip-bookings/${tripBookingId}/cancel`, { auth: ctx.token });
  if (expect('POST /trip-bookings/:id/cancel', cancel, 200)) {
    const afterCancel = await GET(`/api/trip-bookings/${tripBookingId}`, { auth: ctx.token });
    const status = afterCancel.body?.data?.payment_status;
    status === 'failed'
      ? pass('trip_bookings.payment_status = failed setelah cancel')
      : fail('trip_bookings.payment_status = failed setelah cancel', `payment_status = ${status}`);

    const subAcc = afterCancel.body?.data?.accommodation_bookings?.[0];
    subAcc?.payment_status === 'failed'
      ? pass('sub-booking akomodasi ikut failed (cascade jalan)')
      : fail('sub-booking akomodasi ikut failed (cascade jalan)', `payment_status = ${subAcc?.payment_status}`);

    const canvasAfterCancel = await GET(`/api/trips/${bookingTripId}`, { auth: ctx.token });
    const stopAfterCancel = canvasAfterCancel.body?.data?.stops?.find((s) => s.id === stopId);
    stopAfterCancel?.accommodation_status === 'pending'
      ? pass('trip_stops.accommodation_status kembali pending setelah cancel (siap checkout ulang)')
      : fail('trip_stops.accommodation_status kembali pending setelah cancel', `accommodation_status = ${stopAfterCancel?.accommodation_status}`);
  }

  const cancelNotFound = await POST('/api/trip-bookings/00000000-0000-0000-0000-000000000000/cancel', { auth: ctx.token });
  expect('cancel trip booking tidak ada -> 404', cancelNotFound, 404);

  // Bersihkan stop yang tersisa (sekarang boleh dihapus karena
  // accommodation_status sudah bukan 'booked' lagi)
  const removeStop = await DEL(`/api/trips/${bookingTripId}/stops/${stopId}`, { auth: ctx.token });
  expect('DELETE stop (bersihkan trip booking test)', removeStop, 200);
}
// ═════════════════════════════════════════════════════════════
// 18. WEBHOOK XENDIT
// ═════════════════════════════════════════════════════════════
async function testWebhook() {
  section('18. Webhook Xendit');

  const noToken = await POST('/api/webhooks/xendit', { body: { external_id: 'X', status: 'PAID' } });
  expect('webhook tanpa x-callback-token -> 401', noToken, 401);

  const wrongToken = await POST('/api/webhooks/xendit', {
    body: { external_id: 'X', status: 'PAID' },
    headers: { 'x-callback-token': 'token-palsu' },
  });
  expect('webhook token salah -> 401', wrongToken, 401);

  if (!CONFIG.XENDIT_CALLBACK_TOKEN) {
    return skip('tes webhook dengan token valid', 'XENDIT_CALLBACK_TOKEN tidak ada di .env');
  }
  const h = { 'x-callback-token': CONFIG.XENDIT_CALLBACK_TOKEN };

  const incomplete = await POST('/api/webhooks/xendit', { body: { status: 'PAID' }, headers: h });
  expect('payload tidak lengkap -> 200 processed:false', incomplete, 200, (b) =>
    b?.processed === false ? true : `processed = ${b?.processed}`);

  const unknownStatus = await POST('/api/webhooks/xendit', {
    body: { external_id: 'APAPUN', status: 'PENDING' }, headers: h,
  });
  expect('status PENDING -> 200 diabaikan', unknownStatus, 200, (b) =>
    b?.processed === false ? true : `processed = ${b?.processed}`);

  const unknownBooking = await POST('/api/webhooks/xendit', {
    body: { external_id: 'BOOKING-TIDAK-ADA-12345', status: 'PAID', id: 'inv_dummy' }, headers: h,
  });
  expect('booking_code tidak dikenal -> 200 booking_not_found (bukan 500)', unknownBooking, 200, (b) =>
    b?.processed === false ? true : `processed = ${b?.processed}`);
}

// ═════════════════════════════════════════════════════════════
// 19. CLEANUP
// ═════════════════════════════════════════════════════════════
async function cleanup() {
  section('19. Bersih-bersih data test');

  if (ctx.reviewId) {
    const del = await DEL(`/api/destinations/reviews/${ctx.reviewId}`, { auth: ctx.token });
    expect('DELETE review destinasi buatan test', del, 200, (b) =>
      b?.deleted === true ? true : 'deleted != true');
  } else {
    skip('hapus review destinasi', 'tidak ada review baru yang dibuat');
  }

  if (ctx.accReviewId) {
    const del = await DEL(`/api/accommodations/reviews/${ctx.accReviewId}`, { auth: ctx.token });
    expect('DELETE review akomodasi buatan test', del, 200, (b) =>
      b?.deleted === true ? true : 'deleted != true');
  } else {
    skip('hapus review akomodasi', 'tidak ada review baru yang dibuat');
  }

  if (ctx.flightBookingId) {
    await POST(`/api/flight-bookings/${ctx.flightBookingId}/cancel`, { auth: ctx.token });
    note('booking penerbangan sisa dibatalkan');
  }
  if (ctx.accBookingId) {
    await POST(`/api/accommodation-bookings/${ctx.accBookingId}/cancel`, { auth: ctx.token });
    note('booking akomodasi sisa dibatalkan');
  }

  if (ctx.originalPrefTagIds) {
    const restore = await PUT('/api/preferences', { body: { tag_ids: ctx.originalPrefTagIds }, auth: ctx.token });
    restore.status === 200
      ? pass('preferensi user dikembalikan seperti semula')
      : fail('preferensi user dikembalikan seperti semula', `status ${restore.status}`);
  }
}

// ═════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════
async function main() {
  console.log(`${C.bold}Smart Tourism — Test Semua Endpoint${C.reset}`);
  console.log(`${C.gray}Target : ${CONFIG.BASE_URL}${C.reset}`);

  const ping = await GET('/');
  if (ping.status === 0) {
    console.log(`\n${C.red}Server tidak bisa dihubungi di ${CONFIG.BASE_URL}. Jalankan dulu: node main.js${C.reset}`);
    process.exit(1);
  }

  ctx.photo = loadPhoto();
  if (ctx.photo.ok) {
    console.log(`${C.gray}Foto   : ${CONFIG.PHOTO_PATH} (${ctx.photo.mime}, ${ctx.photo.sizeMb.toFixed(2)} MB)${C.reset}`);
  } else {
    console.log(`${C.yellow}Foto   : ${ctx.photo.reason} — tes upload akan di-skip${C.reset}`);
  }

  try {
    ctx.token = await login();
    console.log(`${C.gray}Auth   : token didapat (${ctx.token.slice(0, 18)}…)${C.reset}`);
  } catch (err) {
    console.log(`\n${C.red}Login gagal: ${err.message}${C.reset}`);
    console.log(`${C.yellow}Isi TEST_EMAIL & TEST_PASSWORD, atau tempel TEST_TOKEN.${C.reset}`);
    process.exit(1);
  }

  const started = Date.now();

  await testHealthAndMaster();
  await testDestinationsPublic();
  await testEvents();
  await testRecommendations();
  await testCities();
  await testAccommodationsPublic();
  await testFlights();
  await testAuthAndPreferences();
  await testBudget();
  await testSaveBookmark();
  await testDestinationReviews();
  await testAccommodationReviews();
  await testFlightBookings();
  await testAccommodationBookings();
  await testRoute();
  await testTripCreate();
  await testTripDirect();
  await testAiChat();
  await testWebhook();
  await cleanup();

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${C.bold}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bold}RINGKASAN${C.reset}  ${C.green}${results.pass} pass${C.reset}  ${C.red}${results.fail} fail${C.reset}  ${C.yellow}${results.skip} skip${C.reset}  ${C.gray}(${elapsed}s)${C.reset}`);

  if (results.failures.length) {
    console.log(`\n${C.bold}${C.red}Yang gagal:${C.reset}`);
    let last = '';
    for (const f of results.failures) {
      if (f.section !== last) { console.log(`\n  ${C.blue}${f.section}${C.reset}`); last = f.section; }
      console.log(`   • ${f.name}`);
      console.log(`     ${C.gray}${f.detail}${C.reset}`);
    }
  } else {
    console.log(`\n${C.green}Semua endpoint yang dites lolos.${C.reset}`);
  }
  console.log('');

  fs.writeFileSync(CAPTURE_OUT, JSON.stringify(callLog, null, 2), 'utf-8');
  console.log(`${C.gray}Capture lengkap (input+output tiap endpoint): ${CAPTURE_OUT}${C.reset}`);

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${C.red}Script crash:${C.reset}`, err);
  try {
    fs.writeFileSync(CAPTURE_OUT, JSON.stringify(callLog, null, 2), 'utf-8');
    console.log(`${C.gray}Capture parsial tersimpan di: ${CAPTURE_OUT}${C.reset}`);
  } catch {}
  process.exit(1);
});