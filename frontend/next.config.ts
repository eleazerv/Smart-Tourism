import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./lib/image-hosts";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Shared with `coverImage()`, which falls back to a placeholder for any
    // stored URL this list does not cover.
    remotePatterns: REMOTE_IMAGE_PATTERNS,
  },
};

export default nextConfig;
