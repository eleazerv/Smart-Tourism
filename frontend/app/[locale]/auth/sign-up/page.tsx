import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/sign-up-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signUp" });
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.signUp");

  return (
    <AuthShell
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("haveAccount")} <AuthLink href="/auth/login">{t("login")}</AuthLink>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
