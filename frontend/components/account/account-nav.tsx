"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, KeyRound, LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/akun", label: "Profil", icon: UserRound },
  { href: "/akun/minat", label: "Minat perjalanan", icon: Heart },
  { href: "/akun/kata-sandi", label: "Ubah kata sandi", icon: KeyRound },
] as const;

/**
 * Vertical menu on desktop, a horizontally scrollable strip of tabs on phones
 * where a sidebar would eat the whole first screen.
 */
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav aria-label="Menu akun" className="md:sticky md:top-20">
      <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {ITEMS.map((item) => {
          // Only /akun needs an exact match; the rest own their subtrees.
          const active =
            item.href === "/akun"
              ? pathname === "/akun"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="shrink-0 md:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition md:rounded-lg",
                  active
                    ? "bg-brand-700 text-white dark:bg-brand-100 dark:text-brand-900"
                    : "text-foreground/80 hover:bg-brand-tint/10 hover:text-brand-700 dark:hover:bg-brand-tint/15 dark:hover:text-brand-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={signOut}
        className="mt-2 hidden w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-brand-tint/10 hover:text-brand-700 md:flex dark:hover:bg-brand-tint/15 dark:hover:text-brand-100"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Keluar
      </button>
    </nav>
  );
}
