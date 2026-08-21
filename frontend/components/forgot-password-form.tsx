"use client";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthSubmit } from "@/components/auth/auth-shell";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // This URL must also be listed under Authentication > URL Configuration
      // in the Supabase dashboard.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan. Coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <p className="text-sm text-muted-foreground">
        Jika email tersebut terdaftar, kami sudah mengirimkan tautan untuk
        mengatur ulang kata sandi. Periksa kotak masuk Anda.
      </p>
    );
  }

  return (
    <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <AuthError message={error} />

      <AuthSubmit pending={isLoading} pendingLabel="Mengirim...">
        Kirim tautan atur ulang
      </AuthSubmit>
    </form>
  );
}
