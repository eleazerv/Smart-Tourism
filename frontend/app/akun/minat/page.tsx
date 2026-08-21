import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPreferences, getTags } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { AccountSection } from "@/components/account/account-section";
import { PreferenceEditor } from "@/components/account/preference-editor";
import { LoadError } from "@/components/home/load-error";

export const metadata: Metadata = { title: "Minat Perjalanan" };

/** The master tag list is the same for everyone, so it can be cached. */
async function loadAllTags() {
  "use cache";
  cacheLife("hours");
  return getTags();
}

async function PreferenceSection() {
  const token = await requireAccessToken();

  let allTags;
  let selected;
  try {
    [allTags, selected] = await Promise.all([
      loadAllTags(),
      getPreferences({ token }),
    ]);
  } catch {
    return <LoadError what="Daftar minat" />;
  }

  return <PreferenceEditor allTags={allTags} selected={selected} />;
}

export default function AccountInterestsPage() {
  return (
    <AccountSection
      title="Minat perjalanan"
      description="Pilih jenis destinasi yang Anda sukai. Rekomendasi di halaman Profil dan beranda mengikuti pilihan ini."
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
