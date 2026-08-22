import Image from "next/image";
import { getProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { AccountNav } from "@/components/account/account-nav";
import { initialsOf } from "@/components/account/initials";

/**
 * Identity block above the account menu. Reads the session, so it is rendered
 * inside a Suspense boundary by the layout.
 */
export async function AccountSidebar() {
  const token = await getAccessToken();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sessionEmail = (data?.claims?.email as string | undefined) ?? "";

  let profile = null;
  if (token) {
    try {
      profile = await getProfile({ token });
    } catch {
      // The menu is useful even when /api/auth/me is unreachable.
    }
  }

  const email = profile?.email ?? sessionEmail;
  const name = profile?.full_name?.trim() || email.split("@")[0] || "Akun";

  return (
    <div className="space-y-4">
      <div className="hidden items-center gap-3 md:flex">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white dark:bg-brand-100 dark:text-brand-900"
          >
            {initialsOf(name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <AccountNav />
    </div>
  );
}
