import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.signUpSuccess" });
  return { title: t("metaTitle") };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.signUpSuccess");

  return (
    <AuthShell
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("confirmed")} <AuthLink href="/auth/login">{t("login")}</AuthLink>
        </>
      }
    >
      <div className="flex gap-3">
        <MailCheck className="h-5 w-5 shrink-0 text-brand-700" />
        <p className="text-sm text-muted-foreground">{t("body")}</p>
      </div>
    </AuthShell>
  );
}
