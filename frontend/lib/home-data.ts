/**
 * Editorial copy for the landing page — the parts that have no table behind
 * them yet (inspiration, footer). Everything that the Express API can
 * answer for (destinations, tags) is fetched through `@/lib/api` instead.
 */
import { isOptimizableImage } from "@/lib/image-hosts";

/** Deterministic placeholder photo, keyed by seed. */
export function photo(seed: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

/**
 * Destination covers are still null across much of the seeded database, so
 * fall back to a stable placeholder keyed by the row's own name.
 *
 * A stored URL is also dropped when its host is not in `remotePatterns`:
 * `next/image` throws on an unconfigured host, so one stray CMS link in the
 * data would otherwise break every page that lists that destination.
 */
export function coverImage(
  item: { name: string; cover_image_url: string | null },
  w = 800,
  h = 600,
) {
  const stored = item.cover_image_url;
  if (stored && isOptimizableImage(stored)) return stored;
  return photo(item.name, w, h);
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
