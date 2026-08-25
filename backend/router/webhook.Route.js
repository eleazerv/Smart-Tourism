import express from 'express';

import { handleXenditWebhook } from '../controllers/xenditwebhook.Controller.js';
const router = express.Router();

/**
 * @swagger
 * /api/webhooks/xendit:
 *   post:
 *     summary: Endpoint callback untuk Xendit (bukan untuk dipanggil frontend)
 *     description: >
 *       Dipanggil server Xendit setiap kali status invoice berubah.
 *       Tidak memakai bearer token; keasliannya diperiksa lewat header
 *       x-callback-token. Inilah satu-satunya jalur yang boleh mengubah
 *       payment_status menjadi paid.
 *     tags: [Webhooks]
 *     parameters:
 *       - in: header
 *         name: x-callback-token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Diterima (baik diproses maupun sengaja diabaikan)
 *       401:
 *         description: Token callback tidak cocok
 */
// Sengaja TANPA rate limiter: membatasi endpoint ini berisiko menolak
// callback sah dari Xendit saat ada lonjakan transaksi, dan callback yang
// ditolak berarti status pembayaran tidak pernah ter-update.
router.post('/xendit', handleXenditWebhook);

export default router;