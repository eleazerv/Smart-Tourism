import { supabase } from './supabase.js';
import { estimateDrivingRoute } from './openroute.js';
import {
  getDestinationCity, resolveOrCreateStop,
  createStop, nextItemSequence, loadOwnedStop,
} from './tripStops.helper.js'; // sesuaikan path relatifnya

// Validasi ringan sebelum query ke database -- kalau model salah kirim
// (nama tempat, string kosong, dsb) alih-alih UUID, ini mengembalikan
// pesan yang bisa diperbaiki model sendiri, bukan error Postgres mentah
// (invalid input syntax for type uuid) yang cuma bikin bingung.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_cities',
      description:
        'Ambil daftar kota beserta id-nya. WAJIB dipakai lebih dulu kalau perlu origin_city_id atau destination_city_id untuk mencari penerbangan, karena id kota tidak bisa ditebak.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Saring berdasarkan nama kota, opsional' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_destinations',
      description:
        'Cari destinasi wisata. Parameter queries HANYA untuk sinonim dari SATU maksud yang sama — misal pengguna bilang "muncak", kirim ["muncak","puncak","bukit","pendakian"]. JANGAN mencampur nama daerah dengan jenis tempat di dalam queries (contoh SALAH: ["Bali","pantai","budaya"]), karena kata seperti "pantai" akan mencari ke seluruh Indonesia dan hasil dari luar daerah yang dimaksud ikut terbawa. Untuk membatasi wilayah, panggil list_cities dulu lalu pakai city_id atau province_id, bukan menaruh nama daerahnya sebagai kata kunci.',
      parameters: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Sampai 4 sinonim untuk maksud yang sama. Satu kata pun tetap ditulis sebagai array.',
          },
          tags: {
            type: 'string',
            description:
              'Slug tag dipisah koma. Contoh: pantai,alam,tersembunyi. Tag "tersembunyi" berarti tempat yang belum ramai.',
          },
          city_id: { type: 'integer' },
          province_id: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_destination_detail',
      description:
        'Ambil detail lengkap satu destinasi, termasuk koordinat dan kotanya. ' +
        'destination_id WAJIB berupa UUID persis seperti field "id" pada hasil ' +
        'search_destinations -- JANGAN kirim nama destinasinya.',
      parameters: {
        type: 'object',
        properties: {
          destination_id: {
            type: 'string',
            description: 'UUID destinasi, ambil dari field id hasil search_destinations. Bukan nama tempatnya.',
          },
        },
        required: ['destination_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_seasonal_recommendations',
      description:
        'Rekomendasi destinasi berdasarkan musim pada bulan tertentu. Pakai kalau pengguna menyebut waktu perjalanan tapi belum menentukan tujuan, atau bertanya "bulan ini enaknya ke mana".',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'integer', description: '1 sampai 12' },
          province_id: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_recommendations',
      description:
        'Rekomendasi berdasarkan tag preferensi yang sudah disimpan pengguna. Pakai kalau pengguna minta saran tanpa menyebut kriteria apa pun.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_accommodations',
      description:
        'Cari penginapan di sekitar sebuah destinasi, diurutkan dari yang terdekat. Pakai setelah destinasi ditentukan.',
      parameters: {
        type: 'object',
        properties: {
          destination_id: { type: 'string' },
          tier: { type: 'string', enum: ['budget', 'mid', 'luxury'] },
        },
        required: ['destination_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_flight_calendar',
      description:
        'Harga tiket termurah per hari selama satu bulan untuk satu rute. Pakai kalau tanggal perjalanan masih fleksibel dan pengguna ingin tahu hari termurah.',
      parameters: {
        type: 'object',
        properties: {
          origin_city_id: { type: 'integer' },
          destination_city_id: { type: 'integer' },
          month: { type: 'string', description: 'Format YYYY-MM' },
        },
        required: ['origin_city_id', 'destination_city_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_flights_by_date',
      description:
        'Daftar penerbangan pada satu tanggal untuk satu rute, lengkap dengan maskapai, jam, dan harga.',
      parameters: {
        type: 'object',
        properties: {
          origin_city_id: { type: 'integer' },
          destination_city_id: { type: 'integer' },
          date: { type: 'string', description: 'Format YYYY-MM-DD' },
        },
        required: ['origin_city_id', 'destination_city_id', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_events',
      description: 'Cari acara atau festival pada bulan atau kota tertentu.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'integer' },
          city_id: { type: 'integer' },
          province_id: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_route',
      description:
        'Perkirakan jarak dan lama perjalanan DARAT antara dua destinasi. Hanya berguna untuk destinasi yang berdekatan di pulau yang sama. Untuk antarpulau, gunakan pencarian penerbangan.',
      parameters: {
        type: 'object',
        properties: {
          from_destination_id: { type: 'string' },
          to_destination_id: { type: 'string' },
        },
        required: ['from_destination_id', 'to_destination_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estimate_budget',
      description:
        'Hitung perkiraan biaya perjalanan: tiket pulang-pergi, penginapan, dan makan.',
      parameters: {
        type: 'object',
        properties: {
          destination_id: { type: 'string' },
          origin_city_id: { type: 'integer' },
          tier: { type: 'string', enum: ['budget', 'mid', 'luxury'] },
          duration_days: { type: 'integer' },
          travelers: { type: 'integer' },
        },
        required: ['destination_id', 'origin_city_id', 'tier', 'duration_days', 'travelers'],
      },
    },
  },

  // ---------- Tool yang MENGUBAH canvas ----------
  {
    type: 'function',
    function: {
      name: 'add_destination_to_trip',
      description:
        'Tambahkan satu destinasi ke rencana perjalanan. Panggil sekali per destinasi. ' +
        'Kota tujuannya otomatis ditentukan dari kota destinasi itu -- kalau kota itu belum ' +
        'disinggahi, stop baru dibuat otomatis. Statusnya "suggested" sampai pengguna menyetujui.',
      parameters: {
        type: 'object',
        properties: {
          destination_id: { type: 'string', description: 'UUID dari hasil search_destinations, bukan nama tempatnya.' },
          notes: { type: 'string', description: 'Alasan singkat kenapa tempat ini cocok' },
        },
        required: ['destination_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_trip_item',
      description:
        'Buang satu destinasi dari rencana. Pakai saat pengguna bilang tidak mau ke tempat tertentu.',
      parameters: {
        type: 'object',
        properties: { item_id: { type: 'string' } },
        required: ['item_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_trip_items',
      description:
        'Tandai destinasi sebagai disetujui pengguna. Hanya yang disetujui yang akan diproses saat checkout.',
      parameters: {
        type: 'object',
        properties: {
          item_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['item_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_trip_items',
      description:
        'Ubah urutan kunjungan destinasi DI DALAM satu kota. Kirim stop_id kota itu ' +
        'beserta seluruh item_id di dalamnya sesuai urutan yang diinginkan. ' +
        'Untuk mengubah urutan antar-kota, pakai reorder_trip_stops.',
      parameters: {
        type: 'object',
        properties: {
          stop_id: { type: 'string' },
          ordered_item_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['stop_id', 'ordered_item_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_trip_stops',
      description:
        'Ubah urutan kota yang disinggahi. Kirim seluruh stop_id sesuai urutan ' +
        'perjalanan yang diinginkan.',
      parameters: {
        type: 'object',
        properties: {
          ordered_stop_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['ordered_stop_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_accommodation_for_stop',
      description:
        'Usulkan penginapan dan tanggal menginap untuk satu KOTA dalam rencana. ' +
        'Satu penginapan berlaku untuk semua destinasi di kota itu, jadi cukup ' +
        'dipanggil sekali per kota -- bukan per destinasi. Ini baru USULAN -- panggil ' +
        'confirm_accommodation_for_stop setelah pengguna setuju, baru ikut checkout.',
      parameters: {
        type: 'object',
        properties: {
          stop_id: { type: 'string' },
          accommodation_id: { type: 'string' },
          check_in: { type: 'string', description: 'YYYY-MM-DD' },
          check_out: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['stop_id', 'accommodation_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_accommodation_for_stop',
      description:
        'Tandai penginapan yang diusulkan untuk satu kota sebagai disetujui pengguna. ' +
        'Hanya yang disetujui yang akan diproses saat checkout. Panggil ini SETELAH ' +
        'pengguna bilang setuju di chat, jangan langsung setelah set_accommodation_for_stop.',
      parameters: {
        type: 'object',
        properties: {
          stop_id: { type: 'string' },
        },
        required: ['stop_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_flight_for_stop',
      description:
        'Usulkan penerbangan untuk satu KOTA dalam rencana. flight_role "arrival" untuk ' +
        'penerbangan MENUJU kota itu, "departure" untuk penerbangan MENINGGALKAN kota itu. ' +
        'Trip dengan banyak kota butuh ini dipanggil untuk tiap perpindahan, bukan cuma sekali. ' +
        'Ini baru USULAN -- panggil confirm_flight_for_stop setelah pengguna setuju.',
      parameters: {
        type: 'object',
        properties: {
          stop_id: { type: 'string' },
          flight_option_id: { type: 'string' },
          flight_role: { type: 'string', enum: ['arrival', 'departure'] },
        },
        required: ['stop_id', 'flight_option_id', 'flight_role'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_flight_for_stop',
      description:
        'Tandai penerbangan yang diusulkan untuk satu kota+role sebagai disetujui pengguna. ' +
        'Hanya yang disetujui yang akan diproses saat checkout. Panggil ini SETELAH pengguna ' +
        'bilang setuju di chat, jangan langsung setelah set_flight_for_stop.',
      parameters: {
        type: 'object',
        properties: {
          stop_id: { type: 'string' },
          flight_role: { type: 'string', enum: ['arrival', 'departure'] },
        },
        required: ['stop_id', 'flight_role'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_trip_info',
      description:
        'Perbarui informasi umum perjalanan: nama, tanggal, jumlah orang, atau kota asal.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          start_date: { type: 'string', description: 'YYYY-MM-DD' },
          end_date: { type: 'string', description: 'YYYY-MM-DD' },
          travelers: { type: 'integer' },
          origin_city_id: { type: 'integer' },
        },
      },
    },
  },
];

// ctx berisi { db, user, tripId }.
//   db     -> klien Supabase milik pengguna (RLS aktif). Dipakai untuk
//             semua penulisan canvas.
//   supabase -> klien publik. Dipakai untuk pembacaan data katalog.

const DEST_FIELDS = `
  id, name, description, category, cover_image_url, avg_rating, view_count,
  latitude, longitude,
  provinces ( id, code, name ),
  cities ( id, name )
`;

// Kolom departure_time bertipe `timestamp without time zone`, jadi
// pembandingnya harus waktu LOKAL, bukan `new Date().toISOString()` yang
// selalu UTC. Ini bug yang sama seperti yang pernah muncul di alur booking:
// selisih 7 jam membuat penerbangan yang sudah lewat masih ikut terbawa.
const pad = (n) => String(n).padStart(2, '0');

function nowLocalTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Perbandingan string aman di sini karena formatnya seragam YYYY-MM-DDTHH:mm:ss.
function maxTimestamp(a, b) {
  return a > b ? a : b;
}

// Jarak garis lurus antara dua koordinat, dalam km.
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Item yang sudah dipesan tidak boleh diubah lagi lewat chat: mengubahnya
// hanya membuat canvas berbeda dari booking yang ada.
async function assertItemEditable(db, itemId, tripId) {
  const { data, error } = await db
    .from('trip_items')
    .select(`
      id, status, trip_stop_id,
      destinations ( name ),
      trip_stops!inner ( id, trip_id, city_id, accommodation_id, accommodation_status )
    `)
    .eq('id', itemId)
    .eq('trip_stops.trip_id', tripId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false, reason: 'Item tidak ditemukan dalam rencana ini' };
  return { ok: true, row: data };
}

const HANDLERS = {
  async list_cities({ query }) {
    let q = supabase.from('cities').select('id, name, is_major_hub, provinces(name)');
    if (query) q = q.ilike('name', `%${query}%`);
    const { data, error } = await q.order('id');
    if (error) throw error;
    return { cities: data };
  },

  // Menjalankan semua kata kunci sekaligus lalu menggabungkan hasilnya.
  async search_destinations({ queries, query, tags, city_id, province_id }) {
    const keywords = Array.isArray(queries) && queries.length
      ? queries.slice(0, 4)
      : (query ? [query] : [null]);

    const tagSlugs = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : null;

    const runs = await Promise.all(
      keywords.map((kw) =>
        supabase.rpc('search_destinations', {
          q: kw || null,
          tag_slugs: tagSlugs,
          filter_province_id: province_id ? Number(province_id) : null,
          filter_city_id: city_id ? Number(city_id) : null,
          page_number: 1,
          page_size: 25,
        })
      )
    );

    const firstError = runs.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    const byId = new Map();
    runs.forEach((run, idx) => {
      const kw = keywords[idx];
      for (const r of run.data || []) {
        const existing = byId.get(r.id);
        if (existing) {
          existing.hits += 1;
          if (kw) existing.matched.push(kw);
        } else {
          byId.set(r.id, { row: r, hits: 1, firstAt: idx, matched: kw ? [kw] : [] });
        }
      }
    });

    const merged = [...byId.values()].sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return a.firstAt - b.firstAt;
    });

    return {
      count: merged.length,
      keywords_used: keywords.filter(Boolean),
      note: keywords.filter(Boolean).length > 1
        ? 'Hasil digabung dari beberapa kata kunci. Perhatikan kolom city — kata kunci umum bisa menjaring destinasi di luar daerah yang dimaksud pengguna. Jangan tawarkan yang kotanya tidak nyambung dengan permintaan.'
        : undefined,
      destinations: merged.slice(0, 25).map(({ row: r, matched }) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        city: r.city_name,
        province: r.province_name,
        rating: r.avg_rating,
        latitude: r.latitude,
        longitude: r.longitude,
        matched_keyword: matched.length ? matched.join('/') : undefined,
        note: r.description?.slice(0, 90),
      })),
    };
  },

  async get_destination_detail({ destination_id }) {
    if (!isUuid(destination_id)) {
      return { error: `destination_id harus UUID dari hasil search_destinations, bukan "${destination_id}". Cari dulu lewat search_destinations untuk dapat id-nya.` };
    }

    const { data, error } = await supabase
      .from('destinations')
      .select(DEST_FIELDS)
      .eq('id', destination_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: 'Destinasi tidak ditemukan' };
    return { destination: data };
  },

  async get_seasonal_recommendations({ month, province_id }) {
    let q = supabase
      .from('climate_patterns')
      .select('season, recommended_activities, provinces(id, name)')
      .contains('months', [Number(month) || new Date().getMonth() + 1]);
    if (province_id) q = q.eq('province_id', province_id);

    const { data, error } = await q.limit(10);
    if (error) throw error;
    return { season_info: data };
  },

  async get_my_recommendations(_args, ctx) {
    const { data, error } = await ctx.db
      .from('user_preference_tags')
      .select('tags ( id, name, slug )')
      .eq('user_id', ctx.user.id);
    if (error) throw error;

    const tags = (data || []).map((r) => r.tags).filter(Boolean);
    if (tags.length === 0) {
      return { preference_tags: [], message: 'Pengguna belum mengatur preferensi apa pun.' };
    }

    const { data: destTags } = await supabase
      .from('destination_tags')
      .select('destination_id')
      .in('tag_id', tags.map((t) => t.id));

    const ids = [...new Set((destTags || []).map((r) => r.destination_id))].slice(0, 20);
    if (ids.length === 0) return { preference_tags: tags, destinations: [] };

    const { data: dests } = await supabase
      .from('destinations')
      .select('id, name, category, avg_rating, cities(name)')
      .in('id', ids);

    return { preference_tags: tags.map((t) => t.slug), destinations: dests };
  },

  async search_accommodations({ destination_id, tier }) {
    if (!isUuid(destination_id)) {
      return { error: `destination_id harus UUID dari hasil search_destinations, bukan "${destination_id}".` };
    }

    const { data: dest } = await supabase
      .from('destinations')
      .select('city_id, name, latitude, longitude')
      .eq('id', destination_id)
      .maybeSingle();
    if (!dest) return { error: 'Destinasi tidak ditemukan' };

    let q = supabase
      .from('accommodations')
      .select('id, name, tier, price_per_night, max_guests, partner_name, latitude, longitude')
      .eq('city_id', dest.city_id);
    if (tier) q = q.eq('tier', tier);

    const { data, error } = await q.order('price_per_night').limit(10);
    if (error) throw error;

    const withDistance = (data || []).map((a) => ({
      id: a.id,
      name: a.name,
      tier: a.tier,
      price_per_night: a.price_per_night,
      max_guests: a.max_guests,
      latitude: a.latitude,
      longitude: a.longitude,
      distance_km:
        a.latitude != null && a.longitude != null && dest.latitude != null && dest.longitude != null
          ? Math.round(haversineKm(dest.latitude, dest.longitude, a.latitude, a.longitude) * 10) / 10
          : null,
    }));

    withDistance.sort((x, y) => {
      if (x.distance_km == null) return 1;
      if (y.distance_km == null) return -1;
      return x.distance_km - y.distance_km;
    });

    return { near: dest.name, accommodations: withDistance };
  },

  async get_flight_calendar({ origin_city_id, destination_city_id, month }) {
    const target = month || new Date().toISOString().slice(0, 7);
    const monthStart = `${target}-01T00:00:00`;
    const now = nowLocalTimestamp();
    const start = monthStart > now ? monthStart : now;
    const [y, m] = target.split('-').map(Number);
    const next = new Date(y, m, 1);
    const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

    const { data, error } = await supabase
      .from('flight_options')
      .select('departure_time, price')
      .eq('origin_city_id', origin_city_id)
      .eq('destination_city_id', destination_city_id)
      .gt('available_seats', 0)
      .gte('departure_time', start)
      .lt('departure_time', end);
    if (error) throw error;

    const lowest = {};
    for (const row of data) {
      const day = row.departure_time.slice(0, 10);
      if (!(day in lowest) || row.price < lowest[day]) lowest[day] = row.price;
    }

    const days = Object.entries(lowest)
      .map(([date, price]) => ({ date, lowest_price: price }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (days.length === 0) {
      return { month: target, message: 'Tidak ada penerbangan pada rute dan bulan ini.' };
    }

    const cheapest = days.reduce((a, b) => (b.lowest_price < a.lowest_price ? b : a));
    return { month: target, cheapest_day: cheapest, days: days.slice(0, 31) };
  },

  async search_flights_by_date({ origin_city_id, destination_city_id, date }) {
    const { data, error } = await supabase
      .from('flight_options')
      .select('id, airline, flight_number, departure_time, arrival_time, price, available_seats')
      .eq('origin_city_id', origin_city_id)
      .eq('destination_city_id', destination_city_id)
      .gte('departure_time', maxTimestamp(`${date}T00:00:00`, nowLocalTimestamp()))
      .lte('departure_time', `${date}T23:59:59`)
      .gt('available_seats', 0)
      .order('price')
      .limit(10);
    if (error) throw error;

    if (!data.length) return { date, message: 'Tidak ada penerbangan pada tanggal ini.' };
    return { date, flights: data };
  },

  async get_events({ month, city_id, province_id }) {
    let q = supabase
      .from('events')
      .select('id, name, month, start_date, description, cities!inner(id, name, province_id)');
    if (month) q = q.eq('month', Number(month));
    if (city_id) q = q.eq('city_id', city_id);
    if (province_id) q = q.eq('cities.province_id', province_id);

    const { data, error } = await q.limit(8);
    if (error) throw error;
    return { events: data };
  },

  async estimate_route({ from_destination_id, to_destination_id }) {
    if (!isUuid(from_destination_id) || !isUuid(to_destination_id)) {
      return { error: 'from_destination_id dan to_destination_id harus UUID dari hasil search_destinations.' };
    }

    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, latitude, longitude')
      .in('id', [from_destination_id, to_destination_id]);
    if (error) throw error;

    const from = data.find((d) => d.id === from_destination_id);
    const to = data.find((d) => d.id === to_destination_id);
    if (!from || !to) return { error: 'Salah satu destinasi tidak ditemukan' };

    const { geometry, ...result } = await estimateDrivingRoute({
      fromLat: from.latitude, fromLng: from.longitude,
      toLat: to.latitude, toLng: to.longitude,
    });

    return { from: from.name, to: to.name, ...result };
  },

  async estimate_budget({ destination_id, origin_city_id, tier, duration_days, travelers }) {
    if (!isUuid(destination_id)) {
      return { error: `destination_id harus UUID dari hasil search_destinations, bukan "${destination_id}".` };
    }

    const { data: dest } = await supabase
      .from('destinations')
      .select('id, name, city_id')
      .eq('id', destination_id)
      .maybeSingle();
    if (!dest) return { error: 'Destinasi tidak ditemukan' };

    const cheapest = async (from, to) => {
      const { data } = await supabase
        .from('flight_options')
        .select('price')
        .eq('origin_city_id', from)
        .eq('destination_city_id', to)
        .gte('departure_time', nowLocalTimestamp())
        .gt('available_seats', 0)
        .order('price')
        .limit(1)
        .maybeSingle();
      return data?.price ?? null;
    };

    const out = await cheapest(origin_city_id, dest.city_id);
    const back = await cheapest(dest.city_id, origin_city_id);

    const { data: acc } = await supabase
      .from('accommodations')
      .select('price_per_night, max_guests')
      .eq('city_id', dest.city_id)
      .eq('tier', tier)
      .order('price_per_night')
      .limit(1)
      .maybeSingle();

    if (out == null || back == null || !acc) {
      return { error: 'Data penerbangan atau akomodasi belum tersedia untuk rute ini.' };
    }

    const food = { budget: 100000, mid: 250000, luxury: 500000 }[tier];
    const nights = Math.max(duration_days - 1, 0);
    const rooms = Math.ceil(travelers / acc.max_guests);

    const flightTotal = (out + back) * travelers;
    const accTotal = acc.price_per_night * nights * rooms;
    const foodTotal = food * duration_days * travelers;

    return {
      destination: dest.name,
      tier,
      breakdown: {
        flight_total: flightTotal,
        accommodation_total: accTotal,
        food_total: foodTotal,
      },
      total_estimate: flightTotal + accTotal + foodTotal,
    };
  },

  // ---------- pengubah canvas ----------

  async add_destination_to_trip({ destination_id, notes }, ctx) {
    if (!isUuid(destination_id)) {
      return { error: `destination_id harus UUID dari hasil search_destinations, bukan "${destination_id}". Cari dulu lewat search_destinations untuk dapat id-nya.` };
    }

    const dest = await getDestinationCity(destination_id);
    if (!dest) return { error: 'Destinasi tidak ditemukan' };

    // Kota tujuan ditentukan dari kota destinasinya sendiri -- stop dibuat
    // otomatis kalau kota itu belum pernah disinggahi di trip ini.
    const { stop, created: stopCreated } = await resolveOrCreateStop(
      ctx.db, ctx.tripId, dest.city_id
    );

    const { data: existing, error: existingError } = await ctx.db
      .from('trip_items')
      .select('id, status, sequence_order')
      .eq('trip_stop_id', stop.id)
      .eq('destination_id', destination_id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      // trip_items tidak lagi punya status 'booked' -- destinasi individual
      // tidak pernah dipesan sendiri, yang dipesan adalah akomodasi di stop.
      if (existing.status !== 'removed') {
        return {
          already_in_trip: dest.name,
          item_id: existing.id,
          stop_id: stop.id,
          city: dest.cities?.name,
          order: existing.sequence_order,
        };
      }

      // Pernah dibuang: hidupkan lagi di posisi lamanya.
      const { data: revived, error: reviveError } = await ctx.db
        .from('trip_items')
        .update({ status: 'suggested', notes: notes || null })
        .eq('id', existing.id)
        .eq('trip_stop_id', stop.id)
        .select('id, sequence_order, status')
        .single();
      if (reviveError) throw reviveError;

      return {
        added: dest.name,
        item_id: revived.id,
        stop_id: stop.id,
        city: dest.cities?.name,
        order: revived.sequence_order,
        revived: true,
      };
    }

    const order = await nextItemSequence(ctx.db, stop.id);

    const { data, error } = await ctx.db
      .from('trip_items')
      .insert({
        trip_stop_id: stop.id,
        destination_id,
        notes: notes || null,
        status: 'suggested',
        sequence_order: order,
      })
      .select('id, sequence_order, status')
      .single();

    if (error) throw error;

    return {
      added: dest.name,
      item_id: data.id,
      stop_id: stop.id,
      city: dest.cities?.name,
      order: data.sequence_order,
      // Model perlu tahu ini supaya bisa bilang "sekalian nambah singgah di
      // X" alih-alih diam-diam membuat stop baru tanpa penjelasan.
      new_stop_created: stopCreated,
    };
  },

  async remove_trip_item({ item_id }, ctx) {
    if (!isUuid(item_id)) {
      return { error: `item_id harus UUID dari canvas, bukan "${item_id}".` };
    }

    const editable = await assertItemEditable(ctx.db, item_id, ctx.tripId);
    if (!editable.ok) return { error: editable.reason };

    const { data, error } = await ctx.db
      .from('trip_items')
      .update({ status: 'removed' })
      .eq('id', item_id)
      .eq('trip_stop_id', editable.row.trip_stop_id)
      .select('id, destinations(name)')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: 'Item tidak ditemukan dalam rencana ini' };
    return { removed: data.destinations?.name, item_id };
  },

  async confirm_trip_items({ item_ids }, ctx) {
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return { error: 'item_ids harus berisi minimal satu id' };
    }

    const { data: stops, error: stopsError } = await ctx.db
      .from('trip_stops')
      .select('id')
      .eq('trip_id', ctx.tripId);
    if (stopsError) throw stopsError;

    const stopIds = (stops || []).map((s) => s.id);
    if (stopIds.length === 0) return { confirmed_count: 0 };

    const { data, error } = await ctx.db
      .from('trip_items')
      .update({ status: 'confirmed' })
      .in('id', item_ids)
      .in('trip_stop_id', stopIds)
      .select('id');
    if (error) throw error;
    return { confirmed_count: data.length };
  },

  async reorder_trip_items({ stop_id, ordered_item_ids }, ctx) {
    if (!Array.isArray(ordered_item_ids) || ordered_item_ids.length === 0) {
      return { error: 'ordered_item_ids harus berisi minimal satu id' };
    }

    const stop = await loadOwnedStop(ctx.db, ctx.tripId, stop_id);
    if (!stop) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    let updated = 0;
    for (let i = 0; i < ordered_item_ids.length; i++) {
      const { data, error } = await ctx.db
        .from('trip_items')
        .update({ sequence_order: i + 1 })
        .eq('id', ordered_item_ids[i])
        .eq('trip_stop_id', stop.id)
        .select('id');
      if (error) throw error;
      updated += data?.length ?? 0;
    }

    if (updated !== ordered_item_ids.length) {
      return {
        reordered: updated,
        warning: `${ordered_item_ids.length - updated} item bukan bagian dari kota ini dan urutannya tidak berubah.`,
      };
    }

    return { reordered: updated };
  },

  async reorder_trip_stops({ ordered_stop_ids }, ctx) {
    if (!Array.isArray(ordered_stop_ids) || ordered_stop_ids.length === 0) {
      return { error: 'ordered_stop_ids harus berisi minimal satu id' };
    }

    let updated = 0;
    for (let i = 0; i < ordered_stop_ids.length; i++) {
      const { data, error } = await ctx.db
        .from('trip_stops')
        .update({ sequence_order: i + 1 })
        .eq('id', ordered_stop_ids[i])
        .eq('trip_id', ctx.tripId)
        .select('id');
      if (error) throw error;
      updated += data?.length ?? 0;
    }

    if (updated !== ordered_stop_ids.length) {
      return {
        reordered: updated,
        warning: `${ordered_stop_ids.length - updated} kota tidak ditemukan dalam rencana ini.`,
      };
    }

    return { reordered: updated };
  },

  async set_accommodation_for_stop({ stop_id, accommodation_id, check_in, check_out }, ctx) {
    const stop = await loadOwnedStop(ctx.db, ctx.tripId, stop_id);
    if (!stop) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    // Akomodasi yang sudah dibayar tidak boleh diganti/geser tanggal dari sini.
    if (stop.accommodation_status === 'booked') {
      return { error: 'Akomodasi kota ini sudah dipesan. Batalkan dulu bookingnya di halaman pesanan sebelum mengganti penginapan atau tanggal.' };
    }

    const { data: acc } = await supabase
      .from('accommodations')
      .select('id, name, price_per_night, max_guests, city_id')
      .eq('id', accommodation_id)
      .maybeSingle();
    if (!acc) return { error: 'Akomodasi tidak ditemukan' };

    if (acc.city_id !== stop.city_id) {
      return { error: `${acc.name} tidak berada di kota ini.` };
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const [label, value] of [['check_in', check_in], ['check_out', check_out]]) {
      if (value && !datePattern.test(value)) {
        return { error: `${label} harus format YYYY-MM-DD` };
      }
    }

    const finalIn = check_in ?? stop.check_in;
    const finalOut = check_out ?? stop.check_out;
    if (finalIn && finalOut && finalOut <= finalIn) {
      return { error: 'check_out harus setelah check_in' };
    }

    // BEDA dengan endpoint REST (patchTripStop): dipanggil dari sini artinya
    // AI yang mengusulkan, jadi statusnya 'suggested' -- BELUM ikut checkout
    // sampai user setuju dan AI memanggil confirm_accommodation_for_stop.
    const patch = {
      accommodation_id,
      accommodation_status: 'suggested',
      accommodation_booking_id: null,
    };
    if (check_in) patch.check_in = check_in;
    if (check_out) patch.check_out = check_out;

    const { data, error } = await ctx.db
      .from('trip_stops')
      .update(patch)
      .eq('id', stop.id)
      .eq('trip_id', ctx.tripId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    return {
      stop_id: stop.id,
      accommodation: acc.name,
      price_per_night: acc.price_per_night,
      check_in: finalIn,
      check_out: finalOut,
      status: 'suggested',
      note: 'Penginapan ini masih usulan -- panggil confirm_accommodation_for_stop setelah pengguna setuju, baru akan ikut checkout.',
    };
  },

  async confirm_accommodation_for_stop({ stop_id }, ctx) {
    const stop = await loadOwnedStop(ctx.db, ctx.tripId, stop_id);
    if (!stop) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    if (stop.accommodation_status === 'booked') {
      return { error: 'Akomodasi kota ini sudah dipesan, tidak perlu dikonfirmasi lagi.' };
    }
    if (stop.accommodation_status !== 'suggested') {
      return { error: 'Belum ada penginapan yang diusulkan untuk kota ini.' };
    }

    const { error } = await ctx.db
      .from('trip_stops')
      .update({ accommodation_status: 'pending' })
      .eq('id', stop.id)
      .eq('trip_id', ctx.tripId);
    if (error) throw error;

    return { stop_id: stop.id, confirmed: true };
  },

  async set_flight_for_stop({ stop_id, flight_option_id, flight_role }, ctx) {
    const stop = await loadOwnedStop(ctx.db, ctx.tripId, stop_id);
    if (!stop) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    const { data: flight } = await supabase
      .from('flight_options')
      .select('id, airline, flight_number, departure_time, price, available_seats')
      .eq('id', flight_option_id)
      .maybeSingle();
    if (!flight) return { error: 'Penerbangan tidak ditemukan' };
    if ((flight.available_seats ?? 0) < 1) return { error: 'Kursi penerbangan ini sudah habis.' };

    const { data: existingLeg, error: legError } = await ctx.db
      .from('trip_flights')
      .select('id, booked_at')
      .eq('trip_stop_id', stop.id)
      .eq('flight_role', flight_role)
      .maybeSingle();
    if (legError) throw legError;

    if (existingLeg?.booked_at) {
      return {
        error: `Penerbangan ${flight_role} untuk kota ini sudah dipesan, jadi tidak bisa diganti dari sini. Batalkan dulu bookingnya di halaman pesanan.`,
      };
    }

    const replaced = existingLeg && existingLeg.id && !existingLeg.booked_at;

    const { error } = await ctx.db
      .from('trip_flights')
      .upsert(
        { trip_id: ctx.tripId, trip_stop_id: stop.id, flight_option_id, flight_role, confirmed: false },
        { onConflict: 'trip_stop_id,flight_role' }
      );
    if (error) throw error;

    return {
      stop_id: stop.id,
      flight_role,
      airline: flight.airline,
      flight_number: flight.flight_number,
      price: flight.price,
      replaced,
      confirmed: false,
      note: 'Penerbangan ini masih usulan -- panggil confirm_flight_for_stop setelah pengguna setuju, baru akan ikut checkout.',
    };
  },

  async confirm_flight_for_stop({ stop_id, flight_role }, ctx) {
    const stop = await loadOwnedStop(ctx.db, ctx.tripId, stop_id);
    if (!stop) return { error: 'Kota (stop) tidak ditemukan dalam rencana ini' };

    const { data: leg, error: legError } = await ctx.db
      .from('trip_flights')
      .select('id, booked_at, confirmed')
      .eq('trip_stop_id', stop.id)
      .eq('flight_role', flight_role)
      .maybeSingle();
    if (legError) throw legError;

    if (!leg) return { error: `Belum ada penerbangan ${flight_role} yang dipilih untuk kota ini.` };
    if (leg.booked_at) return { error: 'Penerbangan ini sudah dipesan, tidak perlu dikonfirmasi lagi.' };
    if (leg.confirmed) return { stop_id: stop.id, flight_role, already_confirmed: true };

    const { error } = await ctx.db
      .from('trip_flights')
      .update({ confirmed: true })
      .eq('id', leg.id);
    if (error) throw error;

    return { stop_id: stop.id, flight_role, confirmed: true };
  },

  async update_trip_info(args, ctx) {
    const patch = {};
    for (const key of ['name', 'start_date', 'end_date', 'travelers', 'origin_city_id']) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    if (Object.keys(patch).length === 0) return { error: 'Tidak ada yang diperbarui' };

    const { data, error } = await ctx.db
      .from('trips')
      .update(patch)
      .eq('id', ctx.tripId)
      .select('id, name, start_date, end_date, travelers, origin_city_id')
      .single();
    if (error) throw error;
    return { trip: data };
  },
};

/**
 * Menjalankan satu tool. Error dari tool sengaja TIDAK dilempar ke atas, tapi
 * dikembalikan sebagai pesan error biasa.
 */
export async function executeTool(name, args, ctx) {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Tool ${name} tidak dikenal` };

  try {
    return await handler(args || {}, ctx);
  } catch (err) {
    console.error(`[tool:${name}] error`, err);
    return { error: `Gagal menjalankan ${name}: ${err.message}` };
  }
}