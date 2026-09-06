import type { Metadata } from "next";
import { SignUpForm } from "@/components/sign-up-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Daftar" };

export default function Page() {
  return (
    <AuthShell
      title="Buat akun"
      description="Gratis. Cukup email untuk mulai menyusun rencana perjalanan Anda."
      footer={
        <>
          Sudah punya akun? <AuthLink href="/auth/login">Masuk</AuthLink>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
