import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      // Placeholder photos for the landing page. Swap for the real
      // `cover_image_url` values coming from /api/destinations.
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
