import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Kata Sandi Baru" };

export default function Page() {
  return (
    <AuthShell
      title="Kata sandi baru"
      description="Masukkan kata sandi baru untuk akun Anda."
    >
      <UpdatePasswordForm redirectTo="/akun" />
    </AuthShell>
  );
}
