import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/home/logo";

/**
 * Shared frame for every page under /auth: brand mark, a way back to the
 * public site, and a single centred card.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-tint/10 hover:text-brand-700 dark:hover:bg-brand-tint/15 dark:hover:text-brand-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke beranda
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </div>
          {footer && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

/** Full-width primary action, matching the brand buttons used site-wide. */
export function AuthSubmit({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

/** Inline link style used inside the auth cards and their footers. */
export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-100"
    >
      {children}
    </Link>
  );
}
