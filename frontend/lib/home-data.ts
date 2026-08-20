/**
 * Placeholder content for the landing page.
 *
 * Every shape here mirrors what the Express API already returns
 * (see backend/controllers/destinations.Controller.js), so each block can be
 * swapped for a real `fetch` without touching the components.
 */

/** Deterministic placeholder photo, keyed by seed. */
export function photo(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export type SearchTab = {
  id: string;
  label: string;
  icon: "compass" | "activity" | "crowd" | "time";
  placeholder: string;
  /** Where submitting this mode takes the visitor. */
  href: string;
};

export const searchTabs: SearchTab[] = [
  {
    id: "all",
    label: "Cari Semua",
    icon: "compass",
    placeholder: "Destinasi, kota, atau taman nasional...",
    href: "/destinations",
  },
  {
    id: "things",
    label: "Hal yang Dapat Dilakukan",
    icon: "activity",
    placeholder: "Aktivitas, tur, atau pengalaman di sekitar Anda...",
    href: "/destinations",
  },
  {
    id: "crowd",
    label: "Cek Kepadatan",
    icon: "crowd",
    placeholder: "Lihat prediksi kepadatan destinasi hari ini...",
    href: "/heatmap",
  },
  {
    id: "timing",
    label: "Waktu Terbaik",
    icon: "time",
    placeholder: "Cari jam & tanggal kunjungan paling sepi...",
    href: "/recommendations",
  },
];

export type Interest = {
  name: string;
  slug: string;
  seed: string;
};

export const interests: Interest[] = [
  { name: "Alam & Petualangan", slug: "alam", seed: "raja-ampat-cliff" },
  { name: "Kuliner", slug: "kuliner", seed: "indonesian-street-food" },
  { name: "Budaya", slug: "budaya", seed: "borobudur-temple" },
  { name: "Bahari", slug: "bahari", seed: "coral-reef-blue" },
];

export type Destination = {
  id: string;
  name: string;
  city: string;
  province: string;
  rating: number;
  reviews: number;
  priceLevel: string;
  category: string;
  badge?: string;
  seed: string;
};

export const nearbyDestinations: Destination[] = [
  {
    id: "d-1",
    name: "Pantai Kelingking",
    city: "Nusa Penida",
    province: "Bali",
    rating: 4.8,
    reviews: 3182,
    priceLevel: "Rp - Rp Rp",
    category: "Pantai, Titik Pandang",
    badge: "Pilihan Traveler 2026",
    seed: "kelingking-cliff",
  },
  {
    id: "d-2",
    name: "Candi Prambanan",
    city: "Sleman",
    province: "DI Yogyakarta",
    rating: 4.7,
    reviews: 2707,
    priceLevel: "Rp Rp",
    category: "Situs Bersejarah, Budaya",
    badge: "Pilihan Traveler 2026",
    seed: "prambanan-sunset",
  },
  {
    id: "d-3",
    name: "Kawah Ijen",
    city: "Banyuwangi",
    province: "Jawa Timur",
    rating: 4.9,
    reviews: 1487,
    priceLevel: "Rp Rp",
    category: "Gunung, Pendakian",
    badge: "Pilihan Traveler 2026",
    seed: "ijen-blue-fire",
  },
  {
    id: "d-4",
    name: "Danau Toba",
    city: "Samosir",
    province: "Sumatera Utara",
    rating: 4.6,
    reviews: 4319,
    priceLevel: "Rp - Rp Rp Rp",
    category: "Danau, Alam, Budaya Batak",
    seed: "lake-toba-morning",
  },
  {
    id: "d-5",
    name: "Labuan Bajo",
    city: "Manggarai Barat",
    province: "Nusa Tenggara Timur",
    rating: 4.8,
    reviews: 2264,
    priceLevel: "Rp Rp - Rp Rp Rp",
    category: "Pelayaran, Bahari",
    seed: "labuan-bajo-boats",
  },
];

export type Story = {
  title: string;
  excerpt: string;
  seed: string;
  cta: string;
};

export const stories: Story[] = [
  {
    title:
      "15 penginapan alam luar biasa di Indonesia untuk beristirahat dan bersantai",
    excerpt:
      "Hidup terkadang bisa begitu sibuk, dan Anda mungkin ingin terbebas dari semua itu. Tidak ada yang lebih menyenangkan dari menghabiskan waktu di hutan saat hujan turun atau di tepi danau yang tenang.",
    seed: "jungle-villa-pool",
    cta: "Baca sekarang",
  },
  {
    title: "3 hari di Labuan Bajo",
    excerpt:
      "Labuan Bajo dikenal sebagai gerbang menuju Pulau Komodo, tetapi selain itu kota kecil ini menyuguhkan banyak hal menarik lainnya, mulai dari gua bersejarah hingga bukit dengan panorama terbaik.",
    seed: "komodo-island-view",
    cta: "Baca sekarang",
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

export type IconicCity = {
  name: string;
  region: string;
  seed: string;
};

export const iconicCities: IconicCity[] = [
  { name: "Yogyakarta", region: "DI Yogyakarta", seed: "yogyakarta-city" },
  { name: "Ubud", region: "Bali", seed: "ubud-rice-terrace" },
  { name: "Bandung", region: "Jawa Barat", seed: "bandung-hills" },
  { name: "Makassar", region: "Sulawesi Selatan", seed: "makassar-harbor" },
  { name: "Raja Ampat", region: "Papua Barat Daya", seed: "raja-ampat-karst" },
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
