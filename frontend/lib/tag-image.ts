import { photo } from "@/lib/home-data";

/**
 * Foto tema liburan, disimpan di `public/tema/<slug>.jpg` — dilayani dari
 * origin sendiri, jadi tidak perlu didaftarkan di `remotePatterns`.
 *
 * Daftarnya ditulis tangan, bukan dibaca dari disk: `InterestTiles` adalah
 * Client Component dan tidak punya akses `fs`, sementara mengecek keberadaan
 * file lewat request hanya akan menambah bolak-balik jaringan. Konsekuensinya,
 * tag baru harus didaftarkan di sini — kalau lupa, petaknya jatuh ke foto
 * placeholder, bukan jadi kotak rusak.
 */
const WITH_PHOTO = new Set([
  "agrowisata",
  "alam",
  "belanja",
  "budaya",
  "camping",
  "diving",
  "edukasi",
  "fotografi",
  "gunung",
  "healing",
  "hemat",
  "keluarga",
  "kota",
  "kuliner",
  "mewah",
  "nightlife",
  "pantai",
  "petualangan",
  "religi",
  "romantis",
  "satwa",
  "sejarah",
  "solo-traveling",
  "tersembunyi",
]);

/** Ukuran hanya dipakai placeholder; berkas lokal disajikan apa adanya. */
export function tagImage(slug: string, w = 600, h = 400): string {
  return WITH_PHOTO.has(slug) ? `/tema/${slug}.jpg` : photo(slug, w, h);
}
