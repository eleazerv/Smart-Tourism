"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { saveDisplayName } from "@/app/akun/actions";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "@/lib/profile-name";

/**
 * Inline rename on the profile card. The card itself is server-rendered, so
 * this owns only the name line.
 */
export function NameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const open = () => {
    setValue(name);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = value.trim();

    if (next === name) {
      cancel();
      return;
    }
    if (next.length < NAME_MIN_LENGTH || next.length > NAME_MAX_LENGTH) {
      setError(`Nama harus ${NAME_MIN_LENGTH}–${NAME_MAX_LENGTH} karakter.`);
      inputRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await saveDisplayName(next);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      // The header menu reads the name off the session claims, so the token has
      // to be re-issued before the new name shows up there.
      await createClient().auth.refreshSession();
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate font-display text-lg font-bold tracking-tight">
          {name}
        </p>
        <button
          type="button"
          onClick={open}
          aria-label="Ubah nama"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-brand-tint/10 hover:text-brand-700 dark:hover:bg-brand-tint/15 dark:hover:text-brand-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && cancel()}
          maxLength={NAME_MAX_LENGTH}
          disabled={pending}
          aria-label="Nama"
          aria-invalid={error ? true : undefined}
          className="h-9 max-w-56"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Simpan nama"
          className="shrink-0 rounded-full bg-brand-700 p-2 text-white transition hover:bg-brand-900 disabled:opacity-50 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          aria-label="Batal"
          className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
