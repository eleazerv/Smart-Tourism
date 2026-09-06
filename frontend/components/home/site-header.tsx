"use client";

import { Link } from "@/i18n/navigation";
import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, Search, X } from "lucide-react";
import { AccountMenu } from "@/components/home/account-menu";
import { LanguageSwitcher } from "@/components/home/language-switcher";
import { Logo } from "@/components/home/logo";
import { cn } from "@/lib/utils";

/**
 * Path-nya tetap dalam bahasa Indonesia di kedua bahasa — hanya labelnya yang
 * berganti. Menerjemahkan segmen URL juga berarti setiap tautan yang sudah
 * beredar harus dipetakan ulang, dan itu tidak sepadan dengan hasilnya.
 */
const NAV = [
  { key: "destinations", href: "/destinations" },
  { key: "hotels", href: "/hotels" },
  { key: "flights", href: "/flights" },
  { key: "map", href: "/peta" },
  { key: "planner", href: "/rencana" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition hover:bg-brand-tint/10 hover:text-brand-700"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("search")}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-brand-tint/10 md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          {/* Keduanya membaca URL: pemilih bahasa untuk tahu halaman mana
              yang harus dibuka dalam bahasa lain, dan menu akun lewat router
              versi i18n. Di bawah Cache Components itu data runtime, jadi
              masing-masing perlu batas Suspense sendiri — tanpa itu seluruh
              cangkang halaman batal di-prerender. */}
          <Suspense fallback={<SwitcherPlaceholder />}>
            <LanguageSwitcher />
          </Suspense>
          <Suspense fallback={<MenuPlaceholder />}>
            <AccountMenu />
          </Suspense>
          <button
            type="button"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-brand-tint/10 md:hidden"
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
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-3 text-sm font-medium hover:bg-brand-tint/10"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

/** Selebar tombol bahasa, supaya header tidak bergeser saat ia muncul. */
function SwitcherPlaceholder() {
  return <div className="hidden h-9 w-16 sm:block" aria-hidden />;
}

/** Sepadan dengan slot yang `AccountMenu` sendiri sisakan sebelum sesi diketahui. */
function MenuPlaceholder() {
  return <div className="h-9 w-9 shrink-0" aria-hidden />;
}
