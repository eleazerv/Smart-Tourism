"use client";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthSubmit } from "@/components/auth/auth-shell";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

const MIN_LENGTH = 6;

/**
 * Used in two places with different guarantees:
 *
 * - `reset`   — reached from the emailed recovery link. Possession of the link
 *               is the proof, and the visitor by definition cannot supply the
 *               old password.
 * - `account` — reached while signed in, where the session alone is weak proof:
 *               an unattended browser could change the password. So the current
 *               password is re-checked before the change is applied.
 */
export function UpdatePasswordForm({
  mode = "reset",
  redirectTo,
  submitLabel,
}: {
  mode?: "reset" | "account";
  /** Where to go after a successful change. Omit to confirm in place. */
  redirectTo?: string;
  submitLabel?: string;
}) {
  const t = useTranslations("password");
  const auth = useTranslations("auth");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const needsCurrent = mode === "account";

  const clearFeedback = () => {
    setError(null);
    setDone(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (password.length < MIN_LENGTH) {
      setError(t("tooShort", { min: MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    if (needsCurrent && password === current) {
      setError(t("mustDiffer"));
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      if (needsCurrent) {
        // updateUser() never checks the old password, so verify it by signing
        // in again with it. Same user, so the session simply refreshes.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const email = session?.user?.email;

        if (!email) {
          setError(t("sessionExpired"));
          return;
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (reauthError) {
          setError(t("currentWrong"));
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }

      setCurrent("");
      setPassword("");
      setConfirm("");
      setDone(true);
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {needsCurrent && (
        <div className="grid gap-2">
          <Label htmlFor="current-password">{t("currentLabel")}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              clearFeedback();
            }}
          />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="password">{t("newLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFeedback();
          }}
        />
        <p className="text-xs text-muted-foreground">
          Minimal {MIN_LENGTH} karakter.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm-password">{t("repeatLabel")}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          required
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            clearFeedback();
          }}
        />
      </div>

      <AuthError message={error} />

      {done && (
        <p
          role="status"
          className="rounded-lg border border-brand-700/30 bg-brand-tint/10 px-3 py-2 text-sm text-brand-900"
        >
          {t("updated")}
        </p>
      )}

      <AuthSubmit pending={isLoading} pendingLabel="Menyimpan...">
        {submitLabel}
      </AuthSubmit>
    </form>
  );
}
