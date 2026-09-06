/**
 * Pembungkus tipis di atas `Intl`, dipakai setiap helper format di `lib/`.
 *
 * Sebelum ada dua bahasa, semua pemformatan menuliskan `"id-ID"` langsung dan
 * nama bulan disimpan sebagai larik kata. Keduanya kini datang dari `Intl`,
 * jadi menambah bahasa ketiga tidak menuntut satu pun kamus baru untuk
 * tanggal, angka, atau nama bulan.
 */

/** Bahasa aplikasi (`id` / `en`) ke tag BCP-47 yang dimengerti `Intl`. */
export function intlLocale(locale: string): string {
  // en-GB, bukan en-US: urutan hari-bulan-tahunnya sama dengan versi
  // Indonesia, jadi tata letak yang sudah ada tidak perlu digeser.
  return locale === "en" ? "en-GB" : "id-ID";
}

const monthCache = new Map<string, string[]>();

/**
 * Dua belas nama bulan dalam bahasa yang diminta, terindeks 0.
 *
 * Di-cache karena dipanggil per render di beberapa komponen sekaligus, dan
 * membangun `DateTimeFormat` jauh lebih mahal daripada memakainya.
 */
export function monthNames(
  locale: string,
  style: "long" | "short" = "long",
): string[] {
  const key = `${locale}:${style}`;
  const cached = monthCache.get(key);
  if (cached) return cached;

  const format = new Intl.DateTimeFormat(intlLocale(locale), { month: style });
  const names = Array.from({ length: 12 }, (_, i) =>
    format.format(new Date(Date.UTC(2000, i, 1))),
  );
  monthCache.set(key, names);
  return names;
}

/** Satu nama bulan, 1–12. Nilai di luar rentang dikembalikan apa adanya. */
export function monthName(
  month: number,
  locale: string,
  style: "long" | "short" = "long",
): string {
  return monthNames(locale, style)[month - 1] ?? String(month);
}

/** Menggabungkan daftar sesuai kaidah bahasanya: "A, B, dan C" / "A, B and C". */
export function joinList(
  items: string[],
  locale: string,
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  return new Intl.ListFormat(intlLocale(locale), {
    style: "long",
    type,
  }).format(items);
}

export function formatNumber(
  value: number | null | undefined,
  locale: string,
): string {
  return (value ?? 0).toLocaleString(intlLocale(locale));
}
