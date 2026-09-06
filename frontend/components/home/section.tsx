import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
  bare = false,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  /** Drop the page gutter and vertical rhythm, for use inside another column. */
  bare?: boolean;
}) {
  return (
    <section className={cn(!bare && "py-8 sm:py-10", className)}>
      <div className={cn(!bare && "container-page")}>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && (
            <Link
              href={action.href}
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline sm:inline-flex"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
