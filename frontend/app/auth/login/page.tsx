import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Masuk" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `?next=` sends the reader back where they were interrupted — the booking
 * step is the one flow that pushes a signed-out visitor here mid-task.
 * Only in-app paths are honoured, so the parameter cannot bounce anyone to
 * another site.
 */
function safeNext(value: string | string[] | undefined): string | undefined {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export default function Page({ searchParams }: PageProps) {
  return (
    <AuthShell
      title="Masuk"
      description="Masuk untuk menyimpan minat perjalanan dan mendapatkan rekomendasi yang dipersonalisasi."
      footer={
        <>
          Belum punya akun? <AuthLink href="/auth/sign-up">Daftar</AuthLink>
        </>
      }
    >
      {/* Reading `next` makes the form dynamic; the shell around it still
          prerenders. */}
      <Suspense fallback={<FormSkeleton />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Form({ searchParams }: PageProps) {
  return <LoginForm redirectTo={safeNext((await searchParams).next)} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-14 animate-pulse rounded-md bg-muted" />
      <div className="h-14 animate-pulse rounded-md bg-muted" />
      <div className="h-9 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
