"use client";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthSubmit } from "@/components/auth/auth-shell";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Tautan konfirmasi mendarat langsung di personalisasi -- itu layar
          // pertama akun baru. Proxy tetap mengarahkan ke sana dari mana pun
          // seandainya tautannya dibuka lewat jalur lain.
          emailRedirectTo: `${window.location.origin}/onboarding`,
          // Carried into the profile row, and used for the header greeting
          // before /api/auth/me has been called.
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
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

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="full-name">Nama lengkap</Label>
        <Input
          id="full-name"
          type="text"
          autoComplete="name"
          placeholder="Budi Santoso"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

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

      <div className="grid gap-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="repeat-password">Ulangi kata sandi</Label>
        <Input
          id="repeat-password"
          type="password"
          autoComplete="new-password"
          required
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
        />
      </div>

      <AuthError message={error} />

      <AuthSubmit pending={isLoading} pendingLabel="Membuat akun...">
        Daftar
      </AuthSubmit>
    </form>
  );
}
