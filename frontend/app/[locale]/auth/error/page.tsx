import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Terjadi Kesalahan" };

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("authError");
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? t("code", { code: params.error })
        : t("unknown")}
    </p>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("authError");
  return (
    <AuthShell
      title={t("title")}
      description={t("description")}
      footer={<AuthLink href="/auth/login">{t("tryAgain")}</AuthLink>}
    >
      <Suspense>
        <ErrorContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
