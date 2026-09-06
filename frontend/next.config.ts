import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { REMOTE_IMAGE_PATTERNS } from "./lib/image-hosts";

// Menunjuk ke `i18n/request.ts`, yang memilih kamus untuk setiap request.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  images: {
    // Shared with `coverImage()`, which falls back to a placeholder for any
    // stored URL this list does not cover.
    remotePatterns: REMOTE_IMAGE_PATTERNS,
  },
};

export default withNextIntl(nextConfig);
