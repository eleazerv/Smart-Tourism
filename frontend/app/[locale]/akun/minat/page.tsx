import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPreferences, getTags } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { AccountSection } from "@/components/account/account-section";
import { PreferenceEditor } from "@/components/account/preference-editor";
import { LoadError } from "@/components/home/load-error";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "interests" });
  return { title: t("metaTitle") };
}

/** The master tag list is the same for everyone, so it can be cached. */
async function loadAllTags() {
  "use cache";
  cacheLife("hours");
  return getTags();
}

async function PreferenceSection() {
  const t = await getTranslations("interests");
  const token = await requireAccessToken();

  let allTags;
  let selected;
  try {
    [allTags, selected] = await Promise.all([
      loadAllTags(),
      getPreferences({ token }),
    ]);
  } catch {
    return <LoadError what={t("loadErrorWhat")} />;
  }

  return <PreferenceEditor allTags={allTags} selected={selected} />;
}

export default async function AccountInterestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("interests");
  return (
    <AccountSection
      title={t("heading")}
      description={t("description")}
    >
      <Suspense fallback={<ChipsSkeleton />}>
        <PreferenceSection />
      </Suspense>
    </AccountSection>
  );
}

function ChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  );
}
