import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { listSavedDestinations, type SavedDestination } from "@/lib/api";
import { requireAccessToken } from "@/lib/api/session";
import { AccountSection } from "@/components/account/account-section";
import { SavedGrid } from "@/components/account/saved-grid";
import { LoadError } from "@/components/home/load-error";

export const metadata: Metadata = { title: "Destinasi Tersimpan" };

async function SavedSection() {
  const token = await requireAccessToken();

  let saved: SavedDestination[];
  try {
    saved = await listSavedDestinations({ token });
  } catch {
    return <LoadError what="Destinasi tersimpan" />;
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Belum ada destinasi tersimpan. Tekan ikon penanda di kartu mana pun
          untuk menyimpannya ke sini.
        </p>
        <Link
          href="/destinations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          <Compass className="h-4 w-4" />
          Jelajahi destinasi
        </Link>
      </div>
    );
  }

  return <SavedGrid saved={saved} />;
}

export default function SavedDestinationsPage() {
  return (
    <AccountSection
      title="Destinasi tersimpan"
      description="Destinasi yang Anda tandai, terbaru di atas."
    >
      <Suspense fallback={<GridSkeleton />}>
        <SavedSection />
      </Suspense>
    </AccountSection>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2.5">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
