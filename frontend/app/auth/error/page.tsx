import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Terjadi Kesalahan" };

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? `Kode kesalahan: ${params.error}`
        : "Kesalahan tidak diketahui."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthShell
      title="Ada yang tidak beres"
      description="Proses autentikasi tidak dapat diselesaikan."
      footer={<AuthLink href="/auth/login">Coba masuk lagi</AuthLink>}
    >
      <Suspense>
        <ErrorContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
