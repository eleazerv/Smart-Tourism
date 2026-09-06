import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The brand lockup — emblem plus wordmark — cropped out of `public/logo.png`
 * and recomposed horizontally so it sits in a header row without shrinking the
 * wordmark to nothing. `public/logo.png` remains the stacked original.
 *
 * Height drives the size; the width follows from the asset's 1966x600 ratio,
 * so callers only ever set a height class.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Jelantara, beranda"
      className={cn("inline-flex items-center", className)}
    >
      <Image
        src="/logo-lockup.png"
        alt="Jelantara"
        width={1966}
        height={600}
        priority
        className="h-9 w-auto"
      />
    </Link>
  );
}
