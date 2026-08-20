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

export type Interest = {
  name: string;
  slug: string;
  seed: string;
};

export const interests: Interest[] = [
  { name: "Taman Nasional", slug: "taman-nasional", seed: "national-park-forest" },
  { name: "Wisata Bahari", slug: "bahari", seed: "coral-reef-blue" },
  { name: "Cagar Budaya", slug: "cagar-budaya", seed: "borobudur-temple" },
  { name: "Desa Wisata", slug: "desa-wisata", seed: "traditional-village-house" },
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
