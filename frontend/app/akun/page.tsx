import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfile } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { AccountSection } from "@/components/account/account-section";
import { ForYouRail } from "@/components/account/for-you-rail";
import { ProfileCard } from "@/components/account/profile-card";

export const metadata: Metadata = { title: "Profil" };

async function ProfileSection() {
  const token = await requireAccessToken();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const fallbackEmail = (data?.claims?.email as string | undefined) ?? "";

  let profile = null;
  try {
    profile = await getProfile({ token });
  } catch {
    // A failed /api/auth/me still leaves us the session email to show.
  }

  return <ProfileCard profile={profile} fallbackEmail={fallbackEmail} />;
}

export default function AccountProfilePage() {
  return (
    <div className="space-y-10">
      <AccountSection title="Profil" description="Informasi akun Anda.">
        <Suspense fallback={<ProfileCardSkeleton />}>
          <ProfileSection />
        </Suspense>
      </AccountSection>

      <Suspense fallback={<RailFallback />}>
        <ForYouRail bare explainEmpty />
      </Suspense>
    </div>
  );
}

function ProfileCardSkeleton() {
  return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
}

function RailFallback() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-48 w-[calc(50%-0.5rem)] shrink-0 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
