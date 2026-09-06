import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("password");
  return (
    <AuthShell
      title={t("resetTitle")}
      description={t("resetDescription")}
      footer={
        <>
          {t("rememberQuestion")}{" "}
          <AuthLink href="/auth/login">{t("backToLogin")}</AuthLink>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
