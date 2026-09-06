"use client";

import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localisedPath } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthSubmit } from "@/components/auth/auth-shell";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm() {
  const locale = useLocale();
  const t = useTranslations("password");
  const auth = useTranslations("auth");
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
        redirectTo: `${window.location.origin}${localisedPath(
          "/auth/update-password",
          locale,
        )}`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : auth("genericError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("resetSent")}
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
