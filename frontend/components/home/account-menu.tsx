"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, Heart, LogOut, Ticket, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/account/avatar";
import { cn } from "@/lib/utils";

/**
 * shadcn's menu items highlight with `--accent`, which in this theme is
 * `176 100% 84%` — a solid bright mint. Every item overrides it with the same
 * translucent leaf wash the rest of the app hovers with.
 */
const ITEM =
  "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm focus:bg-brand-tint/10 focus:text-brand-700 dark:focus:bg-brand-tint/15 dark:focus:text-brand-100 [&>svg]:text-muted-foreground focus:[&>svg]:text-current";

/** Best available display name, without a round-trip to /api/auth/me. */
function displayName(user: User) {
  const meta = user.user_metadata as { full_name?: string } | null;
  return meta?.full_name?.trim() || user.email?.split("@")[0] || "Akun";
}

/**
 * Foto profil dari klaim sesi — terisi untuk akun yang masuk lewat penyedia
 * seperti Google. Akun biasa tidak punya, dan `Avatar` menggambar inisial.
 *
 * Sengaja dibaca dari sesi, bukan dari `/api/auth/me`: header harus tenang
 * pada paint pertama, dan `avatar_url` di tabel users cuma gambar inisial
 * buatan yang toh diperlakukan sebagai "belum ada foto".
 */
function avatarOf(user: User) {
  const meta = user.user_metadata as
    | { avatar_url?: string; picture?: string }
    | null;
  return meta?.avatar_url ?? meta?.picture ?? null;
}

export function AccountMenu({ className }: { className?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // getSession() reads the cookie the proxy already refreshed, so the menu
    // settles on the first paint after hydration instead of after a fetch.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Reserve the slot until the session is known, so the header does not jump
  // from "Masuk" to the avatar on every load.
  if (!ready) {
    return <div className={cn("h-9 w-9 shrink-0", className)} aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className={cn(
          "rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50",
          className,
        )}
      >
        Masuk
      </Link>
    );
  }

  const name = displayName(user);
  const avatarUrl = avatarOf(user);

  const signOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Menu akun ${name}`}
          className={cn(
            "group flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm font-medium transition hover:border-brand-700/30 hover:bg-brand-tint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 data-[state=open]:border-brand-700/30 data-[state=open]:bg-brand-tint/10 dark:hover:border-brand-100/30 dark:hover:bg-brand-tint/15 dark:data-[state=open]:bg-brand-tint/15",
            className,
          )}
        >
          <Avatar name={name} src={avatarUrl} pixels={28} className="h-7 w-7 text-xs" />
          <span className="hidden max-w-24 truncate sm:block">{name}</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl p-1.5">
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2 font-normal">
            <Avatar name={name} src={avatarUrl} pixels={36} className="h-9 w-9 text-xs" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="mx-1" />

          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/akun">
              <UserRound />
              Akun saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/akun/pesanan">
              <Ticket />
              Pesanan saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/akun/minat">
              <Heart />
              Minat perjalanan
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-1" />

          <DropdownMenuItem
            onSelect={() => setConfirming(true)}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive focus:bg-destructive/10 focus:text-destructive [&>svg]:text-destructive"
          >
            <LogOut />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}
