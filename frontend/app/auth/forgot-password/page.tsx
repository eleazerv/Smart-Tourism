import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Lupa Kata Sandi" };

export default function Page() {
  return (
    <AuthShell
      title="Atur ulang kata sandi"
      description="Masukkan email Anda, kami kirimkan tautan untuk membuat kata sandi baru."
      footer={
        <>
          Ingat kata sandi Anda?{" "}
          <AuthLink href="/auth/login">Kembali ke halaman masuk</AuthLink>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
