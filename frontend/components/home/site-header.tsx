"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/home/logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Telusuri", href: "/destinations" },
  { label: "Ulasan", href: "/reviews" },
  { label: "Peta Kepadatan", href: "/heatmap" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-600 dark:hover:text-brand-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Cari"
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-brand-50 dark:hover:bg-brand-600 md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-brand-50 sm:inline-flex dark:hover:bg-brand-600"
          >
            <Globe className="h-4 w-4" />
            IDR
          </button>
          <Link
            href="/auth/login"
            className="hidden rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-brand-50 transition hover:bg-brand-900 sm:inline-flex dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            Masuk
          </Link>
          <button
            type="button"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-brand-50 md:hidden dark:hover:bg-brand-600"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/70 md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="container-page flex flex-col py-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-600"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-brand-50 dark:bg-brand-100 dark:text-brand-900"
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}
