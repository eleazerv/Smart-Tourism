"use client";

import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthError,
  AuthLink,
  AuthSubmit,
} from "@/components/auth/auth-shell";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push(redirectTo ?? "/");
      // The pages are server-rendered from the session cookie, so the router
      // cache has to be dropped for the new session to be picked up.
      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : t("genericError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <AuthLink href="/auth/forgot-password">
            {t("login.forgotPassword")}
          </AuthLink>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <AuthError message={error} />

      <AuthSubmit pending={isLoading} pendingLabel={t("processing")}>
        {t("login.submit")}
      </AuthSubmit>
    </form>
  );
}
