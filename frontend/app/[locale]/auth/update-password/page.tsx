import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { title: "Kata Sandi Baru" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("password");
  return (
    <AuthShell
      title={t("newTitle")}
      description={t("newDescription")}
    >
      <UpdatePasswordForm redirectTo="/akun" />
    </AuthShell>
  );
}
