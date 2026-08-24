import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One facet option. A link rather than a form input: results are
 * server-rendered, so a filter is just another URL, and the panel keeps
 * working while JavaScript is still loading.
 */
export function CheckRow({
  href,
  label,
  hint,
  checked,
  shape = "box",
}: {
  href: string;
  label: React.ReactNode;
  /** Trailing note, usually how many results carry this value. */
  hint?: string;
  checked: boolean;
  /** `radio` for facets where only one value can be active at a time. */
  shape?: "box" | "radio";
}) {
  return (
    <li>
      <Link
        href={href}
        aria-pressed={checked}
        className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid h-4 w-4 shrink-0 place-items-center border transition",
            shape === "radio" ? "rounded-full" : "rounded",
            checked
              ? "border-brand-700 bg-brand-700 text-white dark:border-brand-100 dark:bg-brand-100 dark:text-brand-900"
              : "border-border group-hover:border-brand-700 dark:group-hover:border-brand-100",
          )}
        >
          {checked &&
            (shape === "radio" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            ) : (
              <Check className="h-3 w-3" strokeWidth={3} />
            ))}
        </span>
        <span
          className={cn("min-w-0 flex-1 truncate", checked && "font-semibold")}
        >
          {label}
        </span>
        {hint && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {hint}
          </span>
        )}
      </Link>
    </li>
  );
}
