/**
 * Editorial copy for the landing page — the parts that have no table behind
 * them yet (stories, inspiration, footer). Everything that the Express API can
 * answer for (destinations, tags) is fetched through `@/lib/api` instead.
 */

/** Deterministic placeholder photo, keyed by seed. */
export function photo(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

/**
 * Destination covers are still null across the seeded database, so fall back to
 * a stable placeholder keyed by the row's own name.
 */
export function coverImage(
  item: { name: string; cover_image_url: string | null },
  w = 800,
  h = 600,
) {
  return item.cover_image_url ?? photo(item.name, w, h);
}

export type QuickLink = {
  label: string;
  icon: "destination" | "event" | "crowd" | "time";
  href: string;
};

/** Shortcuts under the search field: what to browse, and the two data tools. */
export const quickLinks: QuickLink[] = [
  { label: "Destinasi", icon: "destination", href: "/destinations" },
  { label: "Event", icon: "event", href: "/events" },
  { label: "Peta Kepadatan", icon: "crowd", href: "/heatmap" },
  { label: "Waktu Sepi", icon: "time", href: "/recommendations" },
];

export type Story = {
  title: string;
  excerpt: string;
  seed: string;
  cta: string;
};

export const stories: Story[] = [
  {
    title: "Menghindari puncak keramaian: panduan memilih jam kunjungan",
    excerpt:
      "Sebagian besar wisatawan datang pada jam dan tanggal yang sama karena tidak ada informasi pembanding. Dengan melihat prediksi kepadatan sebelum berangkat, Anda menikmati destinasi yang sama dengan antrean yang jauh lebih pendek.",
    seed: "sunrise-viewpoint-crowd",
    cta: "Baca panduan",
  },
  {
    title: "Apa itu overtourism dan mengapa kuota kunjungan diperlukan",
    excerpt:
      "Lonjakan wisatawan yang tidak terkendali menambah sampah, menekan ekosistem, dan menurunkan kualitas pengalaman berwisata. Kuota harian menjaga destinasi tetap lestari tanpa menutup aksesnya bagi pengunjung.",
    seed: "eco-trail-forest-path",
    cta: "Pelajari",
  },
];

export type Inspiration = {
  title: string;
  seed: string;
};

export const inspirations: Inspiration[] = [
  { title: "Tempat melihat bintang di seluruh Nusantara, dari Bromo hingga Sumba", seed: "milky-way-mountain" },
  { title: "Nikmati seni di Yogyakarta, Bandung, dan kota budaya populer lainnya", seed: "museum-gallery-art" },
  { title: "13 kota, 13 perjalanan kuliner yang luar biasa", seed: "noodle-bowl-hands" },
  { title: "Menyusuri jalur kereta paling indah di Pulau Jawa", seed: "train-window-rice-field" },
];

export const footerColumns: {
  title: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Platform",
    links: [
      { label: "Destinasi", href: "/destinations" },
      { label: "Peta Kepadatan", href: "/heatmap" },
      { label: "Waktu Terbaik", href: "/recommendations" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { label: "Tentang Kami", href: "/about" },
      { label: "Hubungi Kami", href: "/kontak" },
    ],
  },
];
