import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/home/site-header";
import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { requireAccessToken } from "@/lib/api/session";

export const metadata: Metadata = {
  title: "Rencana Perjalanan",
  description:
    "Susun rencana perjalanan bersama asisten AI: cari destinasi, pilih penginapan dan penerbangan, lalu pesan sekaligus.",
};

/**
 * Kerangka halaman mengikuti /peta, bukan halaman katalog: ruang kerja ini
 * mengisi tinggi layar dan menggulir di dalam panelnya sendiri, jadi footer
 * ditiadakan dan halaman berhenti menggulir di layar besar.
 */
export default function PlannerPage() {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <SiteHeader />
      <main className="min-h-0 flex-1">
        <h1 className="sr-only">Rencana perjalanan bersama asisten AI</h1>
        <Suspense fallback={<Skeleton />}>
          <Gate />
        </Suspense>
      </main>
    </div>
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
  return <div className="h-full animate-pulse bg-muted/40" />;
}
