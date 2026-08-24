/**
 * The single source of truth for which remote images `next/image` may load.
 *
 * `next.config.ts` feeds this straight into `images.remotePatterns`, and
 * `coverImage()` checks URLs against it before handing them to `<Image>` —
 * an unconfigured host is a hard runtime error, so a single stray
 * `cover_image_url` in the database would otherwise take down every page that
 * lists that destination.
 */

export type RemotePattern = {
  protocol: "https";
  hostname: string;
  pathname?: string;
};

export const REMOTE_IMAGE_PATTERNS: RemotePattern[] = [
  // Fallback photos, used wherever `cover_image_url` is still null.
  { protocol: "https", hostname: "picsum.photos" },
  // Seeded profile avatars.
  { protocol: "https", hostname: "ui-avatars.com" },
  // Real destination covers and review photos live in Supabase Storage.
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
];

/**
 * Mirrors the wildcard rules Next applies to `remotePatterns`: in a hostname
 * `*` covers one leading segment and `**` covers any number, and a pathname
 * is matched up to its first `**`.
 */
function hostnameMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) {
    return hostname === pattern.slice(3) || hostname.endsWith(pattern.slice(2));
  }
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    if (!hostname.endsWith(suffix)) return false;
    // Exactly one extra segment in front of the suffix.
    return !hostname.slice(0, -suffix.length).includes(".");
  }
  return hostname === pattern;
}

function pathnameMatches(pathname: string, pattern?: string): boolean {
  if (!pattern) return true;
  const [prefix] = pattern.split("**");
  return pathname.startsWith(prefix);
}

/** Whether `next/image` is configured to optimise this URL. */
export function isOptimizableImage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Relative paths are served from this origin, which is always allowed.
    return url.startsWith("/");
  }

  return REMOTE_IMAGE_PATTERNS.some(
    (pattern) =>
      `${pattern.protocol}:` === parsed.protocol &&
      hostnameMatches(parsed.hostname, pattern.hostname) &&
      pathnameMatches(parsed.pathname, pattern.pathname),
  );
}
