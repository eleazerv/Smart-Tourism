import type { Metadata } from "next";
import { AccountSection } from "@/components/account/account-section";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "password" });
  return { title: t("metaTitle") };
}

export default async function AccountPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("password");
  return (
    <AccountSection
      title={t("heading")}
      description={t("description")}
    >
      <div className="max-w-sm rounded-2xl border border-border bg-card p-5">
        <UpdatePasswordForm mode="account" submitLabel={t("submitAccount")} />
      </div>
    </AccountSection>
  );
}
