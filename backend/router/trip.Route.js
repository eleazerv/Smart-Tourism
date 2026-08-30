import express from 'express';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { globalLimiter, moderateLimiter } from '../middleware/RateLimit.js';
import {
  getTrips,
  getTripCanvas,
  patchTrip,
  addTripStop,
  patchTripStop,
  removeTripStop,
  reorderTripStops,
  addTripItem,
  patchTripItem,
  removeTripItem,
  reorderTripItems,
  setTripFlight,
  removeTripFlight,
  checkoutTrip,
} from '../controllers/trip.Controller.js';

const router = express.Router();

// Seluruh endpoint di sini mengubah rencana milik pengguna sendiri.
router.use(authMiddleware);

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Daftar semua trip milik pengguna
 *     description: >
 *       Ringkasan tiap trip (nama, tanggal, jumlah orang, kota asal) --
 *       tanpa stops/items/flights di dalamnya. Pakai GET /api/trips/{id}
 *       untuk detail lengkap satu trip.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar trip, terbaru lebih dulu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string, nullable: true }
 *                       start_date: { type: string, format: date, nullable: true }
 *                       end_date: { type: string, format: date, nullable: true }
 *                       travelers: { type: integer }
 *                       origin_city_id: { type: integer, nullable: true }
 *                       cities: { type: object, nullable: true, properties: { name: { type: string } } }
 *       401: { description: Tidak ada atau tidak valid token }
 */
router.get('/', globalLimiter, getTrips);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Ambil isi rencana (trip, kota yang disinggahi, destinasi, penginapan, penerbangan)
 *     description: >
 *       Sama dengan canvas yang dikembalikan endpoint chat, tapi bisa dipanggil
 *       langsung tanpa melibatkan AI. Dipakai frontend untuk menggambar ulang
 *       panel rencana setelah pengguna mengubah sesuatu sendiri.
 *
 *       Struktur rencana sekarang berjenjang: trip -> stops (satu per kota
 *       yang disinggahi, urut sesuai sequence_order) -> tiap stop punya
 *       destinasi (trip_items), penginapan, dan penerbangan masuk/keluarnya
 *       sendiri.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: trip, stops (dengan items, akomodasi, dan penerbangan di dalamnya)
 *       404: { description: Rencana tidak ditemukan atau bukan milik Anda }
 *   patch:
 *     summary: Ubah info rencana (nama, tanggal, jumlah orang, kota asal)
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *               travelers: { type: integer, minimum: 1 }
 *               origin_city_id: { type: integer }
 *     responses:
 *       200: { description: Rencana diperbarui }
 *       400: { description: Tanggal tidak valid }
 */
router.get('/:id', globalLimiter, getTripCanvas);
router.patch('/:id', moderateLimiter, patchTrip);

// ============================================================
// STOPS -- satu per kota yang disinggahi
// ============================================================

/**
 * @swagger
 * /api/trips/{id}/stops:
 *   post:
 *     summary: Tambah/pastikan ada kota (stop) dalam rencana
 *     description: >
 *       Kalau kota ini belum pernah disinggahi di trip ini, dibuat stop baru
 *       di urutan terakhir. Kalau sudah ada, stop yang sama dipakai lagi
 *       (tidak duplikat) kecuali force_new dikirim true -- dipakai kalau
 *       trip memang singgah ke kota yang sama dua kali (mis. Jakarta -> Bali
 *       -> Jakarta).
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [city_id]
 *             properties:
 *               city_id: { type: integer }
 *               check_in: { type: string, format: date, nullable: true }
 *               check_out: { type: string, format: date, nullable: true }
 *               force_new:
 *                 type: boolean
 *                 description: Paksa buat stop baru walau kota ini sudah pernah disinggahi
 *     responses:
 *       201: { description: Stop baru dibuat }
 *       200: { description: Kota ini sudah ada di rencana, stop yang sama dipakai }
 *       400: { description: city_id tidak diisi atau tanggal tidak valid }
 *       404: { description: Kota tidak ditemukan }
 */
router.post('/:id/stops', moderateLimiter, addTripStop);

/**
 * @swagger
 * /api/trips/{id}/stops/order:
 *   put:
 *     summary: Ubah urutan kota yang disinggahi
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordered_stop_ids]
 *             properties:
 *               ordered_stop_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Urutan kota diperbarui }
 *       400: { description: ordered_stop_ids kosong }
 */
router.put('/:id/stops/order', moderateLimiter, reorderTripStops);

/**
 * @swagger
 * /api/trips/{id}/stops/{stopId}:
 *   patch:
 *     summary: Ubah info satu kota (penginapan, tanggal menginap)
 *     description: >
 *       Penginapan dan tanggal sekarang milik STOP, bukan milik tiap
 *       destinasi -- satu penginapan berlaku untuk semua destinasi di kota
 *       yang sama. Ditolak dengan 409 kalau akomodasi kota ini sudah dibayar
 *       (accommodation_status = booked).
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accommodation_id: { type: string, format: uuid, nullable: true }
 *               check_in: { type: string, format: date, nullable: true }
 *               check_out: { type: string, format: date, nullable: true }
 *     responses:
 *       200: { description: Stop diperbarui }
 *       400: { description: Tanggal tidak valid, atau akomodasi bukan di kota stop ini }
 *       404: { description: Stop atau akomodasi tidak ditemukan }
 *       409: { description: Akomodasi kota ini sudah dibayar, tidak bisa diubah }
 *   delete:
 *     summary: Hapus kota dari rencana (beserta seluruh destinasi di dalamnya)
 *     description: >
 *       Berbeda dengan hapus destinasi (yang cuma ditandai removed), hapus
 *       stop menghapus barisnya sungguhan -- semua trip_items di dalamnya
 *       ikut terhapus. Ditolak kalau akomodasi kota ini sudah dibayar.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Stop dihapus }
 *       404: { description: Stop tidak ditemukan }
 *       409: { description: Akomodasi kota ini sudah dibayar, tidak bisa dihapus }
 */
router.patch('/:id/stops/:stopId', moderateLimiter, patchTripStop);
router.delete('/:id/stops/:stopId', moderateLimiter, removeTripStop);

// ============================================================
// ITEMS -- destinasi di dalam satu stop
// ============================================================

/**
 * @swagger
 * /api/trips/{id}/items:
 *   post:
 *     summary: Tambah destinasi ke rencana (dipilih sendiri oleh pengguna)
 *     description: >
 *       Item yang ditambahkan lewat endpoint ini ditandai added_by=user, supaya
 *       AI tahu bahwa pengguna yang memilihnya dan tidak menjelaskannya ulang
 *       seolah-olah itu usulannya sendiri.
 *
 *       Kota tujuannya otomatis ditentukan dari kota destinasi tersebut --
 *       kalau kota itu belum disinggahi, stop baru dibuat otomatis di
 *       urutan terakhir. stop_id boleh dikirim eksplisit kalau destinasi
 *       harus masuk ke stop tertentu (misal ada dua stop untuk kota yang
 *       sama).
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [destination_id]
 *             properties:
 *               destination_id: { type: string, format: uuid }
 *               notes: { type: string }
 *               stop_id:
 *                 type: string
 *                 format: uuid
 *                 description: Opsional -- paksa masuk ke stop tertentu. Harus satu kota dengan destinasinya.
 *     responses:
 *       201: { description: Destinasi ditambahkan (stop baru mungkin ikut dibuat, lihat stop_id di response) }
 *       200: { description: Sudah ada di rencana, tidak diubah }
 *       400: { description: destination_id tidak diisi, atau stop_id bukan kota yang sama dengan destinasi }
 *       404: { description: Destinasi atau stop tidak ditemukan }
 *       409: { description: Destinasi sudah dipesan lewat stop ini }
 */
router.post('/:id/items', moderateLimiter, addTripItem);

/**
 * @swagger
 * /api/trips/{id}/stops/{stopId}/items/order:
 *   put:
 *     summary: Ubah urutan kunjungan destinasi DI DALAM satu kota
 *     description: >
 *       Urutan destinasi sekarang scope-nya per kota (stop), bukan lintas
 *       seluruh trip. Untuk mengubah urutan antar-kota, pakai
 *       PUT /api/trips/{id}/stops/order.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordered_item_ids]
 *             properties:
 *               ordered_item_ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200: { description: Urutan diperbarui }
 *       400: { description: ordered_item_ids kosong }
 *       404: { description: Stop tidak ditemukan }
 */
router.put('/:id/stops/:stopId/items/order', moderateLimiter, reorderTripItems);

/**
 * @swagger
 * /api/trips/{id}/items/{itemId}:
 *   patch:
 *     summary: Ubah satu item rencana (status, jumlah tamu, catatan)
 *     description: >
 *       Dipakai untuk checkbox konfirmasi dan catatan langsung dari panel --
 *       tanpa melalui AI, jadi tidak memakai token.
 *
 *       accommodation_id, check_in, dan check_out TIDAK LAGI diterima di
 *       sini -- field itu sekarang milik stop induknya (satu penginapan
 *       berlaku untuk semua destinasi di kota yang sama). Kirim field itu
 *       lewat PATCH /api/trips/{id}/stops/{stopId} sebagai gantinya;
 *       mengirimnya ke sini akan ditolak dengan 400 (error: moved_to_stop).
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [suggested, confirmed] }
 *               guests: { type: integer, minimum: 1 }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Item diperbarui }
 *       400: { description: Status/jumlah tamu tidak valid, tamu melebihi kapasitas, atau mengirim field yang sudah pindah ke stop }
 *       404: { description: Item tidak ditemukan }
 *   delete:
 *     summary: Keluarkan destinasi dari rencana
 *     description: >
 *       Ditandai removed, bukan dihapus permanen, supaya bisa dihidupkan
 *       lagi di posisi yang sama kalau pengguna berubah pikiran. Tidak
 *       diblokir oleh status booking apa pun -- yang dipesan adalah
 *       akomodasi di stop induknya, bukan destinasi itu sendiri.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item dikeluarkan }
 *       404: { description: Item tidak ditemukan }
 */
router.patch('/:id/items/:itemId', moderateLimiter, patchTripItem);
router.delete('/:id/items/:itemId', moderateLimiter, removeTripItem);

// ============================================================
// FLIGHTS -- menempel ke stop (arrival/departure), bukan ke trip
// ============================================================

/**
 * @swagger
 * /api/trips/{id}/stops/{stopId}/flights:
 *   put:
 *     summary: Pilih penerbangan masuk atau keluar untuk satu kota
 *     description: >
 *       Penerbangan sekarang menempel ke STOP (kota), bukan ke trip secara
 *       global. flight_role "arrival" untuk penerbangan MENUJU kota ini,
 *       "departure" untuk penerbangan MENINGGALKAN kota ini. Trip dengan
 *       banyak kota bisa memanggil ini berkali-kali, satu per perpindahan --
 *       tidak lagi dibatasi hanya sekali berangkat dan sekali pulang per
 *       trip.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [flight_option_id, flight_role]
 *             properties:
 *               flight_option_id: { type: string, format: uuid }
 *               flight_role: { type: string, enum: [arrival, departure] }
 *     responses:
 *       200: { description: Penerbangan dipilih }
 *       400: { description: flight_role tidak valid atau flight_option_id kosong }
 *       404: { description: Stop atau penerbangan tidak ditemukan }
 *       409: { description: Kursi habis, atau penerbangan untuk stop+role ini sudah dipesan }
 */
router.put('/:id/stops/:stopId/flights', moderateLimiter, setTripFlight);

/**
 * @swagger
 * /api/trips/{id}/stops/{stopId}/flights/{role}:
 *   delete:
 *     summary: Batalkan pilihan penerbangan untuk kota ini (belum dipesan)
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string, enum: [arrival, departure] }
 *     responses:
 *       200: { description: Pilihan dihapus }
 *       400: { description: role tidak valid }
 *       404: { description: Belum ada pilihan untuk stop+role ini }
 *       409: { description: Sudah dipesan, tidak bisa dihapus dari sini }
 */
router.delete('/:id/stops/:stopId/flights/:role', moderateLimiter, removeTripFlight);

// ============================================================
// CHECKOUT
// ============================================================

/**
 * @swagger
 * /api/trips/{id}/checkout:
 *   post:
 *     summary: Ubah rencana yang sudah disusun menjadi booking sungguhan
 *     description: >
 *       Membuat satu trip_booking yang menaungi semua sub-booking yang siap
 *       dipesan: tiap stop dengan akomodasi terpilih + tanggal lengkap +
 *       minimal satu destinasi confirmed jadi satu booking akomodasi, dan
 *       tiap leg penerbangan yang belum dipesan jadi satu booking
 *       penerbangan. Semuanya dinaungi SATU invoice Xendit (lewat
 *       POST /api/trip-bookings/{id}/pay setelahnya), bukan dibayar
 *       terpisah-pisah.
 *
 *       Bisa dipanggil kapan pun rencananya siap -- tidak perlu lewat chat
 *       room, baik rencana disusun oleh AI, lewat panel manual, atau
 *       campuran keduanya.
 *     tags: [Trips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passenger_names:
 *                 type: array
 *                 items: { type: string }
 *                 description: >
 *                   Wajib diisi minimal satu nama kalau trip ini punya leg
 *                   penerbangan yang belum dipesan -- dipakai sama untuk
 *                   semua leg dalam checkout ini.
 *     responses:
 *       201:
 *         description: Trip booking dibuat (booking_code, total_price, flight_count, accommodation_count)
 *       400: { description: Tidak ada yang siap dipesan, atau passenger_names kosong padahal ada leg penerbangan }
 *       404: { description: Trip tidak ditemukan atau bukan milik Anda }
 */
router.post('/:id/checkout', moderateLimiter, checkoutTrip);

export default router;