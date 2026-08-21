import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      aria-label="Smart Tourism, beranda"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn(
          "h-8 w-8",
          tone === "dark" ? "text-brand-700 dark:text-brand-100" : "text-brand-100",
        )}
      >
        <circle cx="16" cy="16" r="15" fill="currentColor" />
        <path
          d="M16 6.5c3.6 2.9 5.6 6.3 5.6 9.9 0 3.6-2.5 6.6-5.6 9.1-3.1-2.5-5.6-5.5-5.6-9.1 0-3.6 2-7 5.6-9.9Z"
          className={
            tone === "dark"
              ? "fill-brand-100 dark:fill-brand-900"
              : "fill-brand-900"
          }
        />
        <circle
          cx="16"
          cy="15.4"
          r="2.6"
          className={
            tone === "dark"
              ? "fill-brand-700 dark:fill-brand-100"
              : "fill-brand-100"
          }
        />
      </svg>
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          tone === "dark" ? "text-brand-700 dark:text-brand-100" : "text-white",
        )}
      >
        Smart<span className="font-normal">Tourism</span>
      </span>
    </Link>
  );
}
