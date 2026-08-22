import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Masuk" };

export default function Page() {
  return (
    <AuthShell
      title="Masuk"
      description="Masuk untuk menyimpan minat perjalanan dan mendapatkan rekomendasi yang dipersonalisasi."
      footer={
        <>
          Belum punya akun? <AuthLink href="/auth/sign-up">Daftar</AuthLink>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
