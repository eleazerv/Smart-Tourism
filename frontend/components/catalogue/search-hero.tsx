import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { photo } from "@/lib/home-data";

export type Crumb = { label: string; href?: string };

/**
 * Photo-backed page head with the search form sitting on it — the shape every
 * travel search opens with. Shared by `/hotels` and `/flights`.
 */
export function SearchHero({
  title,
  subtitle,
  seed,
  crumbs,
  children,
}: {
  title: string;
  subtitle: string;
  /** Keeps the same filter on the same backdrop between renders. */
  seed: string;
  crumbs: Crumb[];
  /** The search panel. */
  children: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-900">
      <Image
        src={photo(seed, 1600, 700)}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/85 to-brand-900/55"
      />

      <div className="container-page relative py-8 sm:py-12">
        <nav aria-label="Remah roti">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-brand-100/80">
            {crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="underline-offset-2 transition hover:text-white hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-100/90 sm:text-base">
          {subtitle}
        </p>

        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

/**
 * Says plainly that the listings below are illustrative.
 *
 * The destination catalogue is backed by the API; hotels and flights have no
 * table behind them yet, and quoting invented rates without saying so would be
 * the one genuinely misleading thing on the site.
 */
export function SampleDataNotice({ what }: { what: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <span className="font-semibold text-foreground">Data contoh.</span>{" "}
        {what} di halaman ini dibuat sebagai purwarupa dan belum terhubung ke
        sistem pemesanan mana pun. Kota dan provinsi mengikuti data destinasi
        yang asli.
      </span>
    </p>
  );
}
