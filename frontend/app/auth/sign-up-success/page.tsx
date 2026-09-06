import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Cek Email Anda" };

export default function Page() {
  return (
    <AuthShell
      title="Cek email Anda"
      description="Akun Anda sudah dibuat."
      footer={
        <>
          Sudah dikonfirmasi? <AuthLink href="/auth/login">Masuk</AuthLink>
        </>
      }
    >
      <div className="flex gap-3">
        <MailCheck className="h-5 w-5 shrink-0 text-brand-700" />
        <p className="text-sm text-muted-foreground">
          Kami mengirim tautan konfirmasi ke email Anda. Buka tautan tersebut
          untuk mengaktifkan akun sebelum masuk.
        </p>
      </div>
    </AuthShell>
  );
}
