import type { Metadata } from "next";
import { AccountSection } from "@/components/account/account-section";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata: Metadata = { title: "Ubah Kata Sandi" };

export default function AccountPasswordPage() {
  return (
    <AccountSection
      title="Ubah kata sandi"
      description="Masukkan kata sandi saat ini untuk memverifikasi bahwa ini benar-benar Anda."
    >
      <div className="max-w-sm rounded-2xl border border-border bg-card p-5">
        <UpdatePasswordForm mode="account" submitLabel="Perbarui kata sandi" />
      </div>
    </AccountSection>
  );
}
