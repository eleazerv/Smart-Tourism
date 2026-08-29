import { getProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { AccountNav } from "@/components/account/account-nav";
import { Avatar } from "@/components/account/avatar";

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
        <Avatar
          name={name}
          src={profile?.avatar_url}
          pixels={40}
          className="h-10 w-10 text-sm"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <AccountNav />
    </div>
  );
}
