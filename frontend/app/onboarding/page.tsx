import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getPreferences, getProfile, getTags, listCities } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_TRAVEL_PROFILE, readTravelProfile } from "@/lib/onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Personalisasi",
  description:
    "Lengkapi profil dan minat perjalanan Anda agar rekomendasi Jelantara sesuai.",
  robots: { index: false, follow: false },
};

/** Daftar tema sama untuk semua orang, jadi aman dipakai bersama. */
async function loadTags() {
  "use cache";
  cacheLife("hours");
  return getTags();
}

/** Idem — hanya dipakai sebagai saran ketik pada isian kota asal. */
async function loadCityNames() {
  "use cache";
  cacheLife("hours");
  const cities = await listCities();
  return [...new Set(cities.map((city) => city.name))];
}

/**
 * Semua isian dimuat di sini supaya wizard bisa dibuka ulang kapan saja tanpa
 * menghapus jawaban lama: yang sudah tersimpan muncul sebagai nilai awal.
 * Backend yang sedang bermasalah tidak boleh mengunci orang di halaman ini,
 * jadi tiap pemuatan punya jalan mundurnya sendiri.
 */
async function Wizard() {
  const token = await requireAccessToken();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const metadata = userData.user?.user_metadata ?? null;

  const [tags, preferences, profile, cities] = await Promise.all([
    loadTags().catch(() => []),
    getPreferences({ token }).catch(() => []),
    getProfile({ token }).catch(() => null),
    loadCityNames().catch(() => []),
  ]);

  const metadataName =
    typeof metadata?.full_name === "string" ? metadata.full_name : "";

  return (
    <OnboardingWizard
      initialName={profile?.full_name ?? metadataName}
      initialTravel={metadata ? readTravelProfile(metadata) : EMPTY_TRAVEL_PROFILE}
      allTags={tags}
      selectedTagIds={preferences.map((tag) => tag.id)}
      cities={cities}
    />
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-brand-tint/[0.07] via-background to-background">
      <Suspense fallback={<WizardSkeleton />}>
        <Wizard />
      </Suspense>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="container-page flex h-16 shrink-0 items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="container-page shrink-0 pb-4">
        <div className="h-1.5 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="container-page flex flex-1 py-8">
        <div className="m-auto w-full max-w-xl space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-[24rem] animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
