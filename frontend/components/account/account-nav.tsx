"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Heart, KeyRound, LogOut, Ticket, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/akun", label: "Profil", icon: UserRound },
  { href: "/akun/pesanan", label: "Pesanan saya", icon: Ticket },
  { href: "/akun/tersimpan", label: "Destinasi tersimpan", icon: Bookmark },
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
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /**
   * Kedua flag dilepas di `finally` -- lihat catatan panjangnya di
   * `account-menu.tsx`. Dialog yang ditinggalkan `pending` akan muncul lagi
   * dengan spinner abadi, dan signOut yang gagal mengunci halaman di balik
   * modal yang tidak bisa ditutup.
   */
  const signOut = async () => {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
      setConfirming(false);
    }
  };

  return (
    <nav aria-label="Menu akun" className="md:sticky md:top-20">
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:flex md:flex-col md:gap-1">
        {ITEMS.map((item) => {
          const active =
            item.href === "/akun"
              ? pathname === "/akun"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium transition md:justify-start md:rounded-lg md:px-4",
                  active
                    ? "bg-brand-700 text-white"
                    : "text-foreground/80 hover:bg-brand-tint/10 hover:text-brand-700",
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
        onClick={() => setConfirming(true)}
        className="mt-2 hidden w-full items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-brand-tint/10 hover:text-brand-700 md:flex"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Keluar
      </button>

      <ConfirmDialog
        open={confirming}
        icon={<LogOut className="h-5 w-5" />}
        title="Keluar dari akun?"
        description="Anda perlu masuk lagi untuk melihat profil dan minat perjalanan Anda."
        confirmLabel={signingOut ? "Keluar..." : "Keluar"}
        destructive
        pending={signingOut}
        onConfirm={signOut}
        onCancel={() => setConfirming(false)}
      />
    </nav>
  );
}
