import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { requireAccessToken } from "@/lib/api/session";

export const metadata: Metadata = {
  title: "Rencana Perjalanan",
  description:
    "Susun rencana perjalanan bersama asisten AI: cari destinasi, pilih penginapan dan penerbangan, lalu pesan sekaligus.",
};

export default function PlannerPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4">
      <Suspense fallback={<Skeleton />}>
        <Gate />
      </Suspense>
    </main>
  );
}

/**
 * Seluruh isi halaman ini butuh token, dan percakapan berjalan di klien.
 * Pengecekan sesi tetap di server supaya pengunjung yang belum masuk
 * diarahkan ke login sebelum ruang kerjanya sempat ter-render.
 */
async function Gate() {
  await requireAccessToken();
  return <PlannerWorkspace />;
}

function Skeleton() {
  return (
    <div className="h-[calc(100dvh-4rem)] animate-pulse rounded-2xl border border-border bg-card" />
  );
}
