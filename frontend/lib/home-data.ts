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
  icon: "destination" | "hotel" | "flight" | "crowd" | "time";
  href: string;
};

/** Shortcuts under the search field: what to browse, and the two data tools. */
export const quickLinks: QuickLink[] = [
  { label: "Destinasi", icon: "destination", href: "/destinations" },
  { label: "Hotel", icon: "hotel", href: "/hotels" },
  { label: "Tiket Pesawat", icon: "flight", href: "/flights" },
  { label: "Peta Wisata", icon: "crowd", href: "/peta" },
  { label: "Waktu Sepi", icon: "time", href: "/recommendations" },
];

export const footerColumns: {
  title: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Platform",
    links: [
      { label: "Destinasi", href: "/destinations" },
      { label: "Hotel", href: "/hotels" },
      { label: "Tiket Pesawat", href: "/flights" },
      { label: "Peta Wisata", href: "/peta" },
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
