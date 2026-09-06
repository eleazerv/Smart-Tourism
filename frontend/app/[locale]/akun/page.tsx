import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfile } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { AccountSection } from "@/components/account/account-section";
import { ForYouRail } from "@/components/account/for-you-rail";
import { ProfileCard } from "@/components/account/profile-card";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "interests" });
  return { title: t("profileMetaTitle") };
}

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

export default async function AccountProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("interests");
  return (
    <div className="space-y-10">
      <AccountSection
        title={t("profileHeading")}
        description={t("profileDescription")}
      >
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
