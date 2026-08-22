import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      // Fallback photos, used wherever `cover_image_url` is still null.
      { protocol: "https", hostname: "picsum.photos" },
      // Seeded profile avatars.
      { protocol: "https", hostname: "ui-avatars.com" },
      // Real destination covers and review photos live in Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
