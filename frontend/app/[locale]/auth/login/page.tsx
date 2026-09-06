import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return { title: t("metaTitle") };
}

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

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.login");

  return (
    <AuthShell
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("noAccount")}{" "}
          <AuthLink href="/auth/sign-up">{t("register")}</AuthLink>
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

async function Form({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
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
