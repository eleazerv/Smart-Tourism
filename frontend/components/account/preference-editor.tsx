"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Tag } from "@/lib/api";
import { savePreferences } from "@/app/akun/actions";
import { cn } from "@/lib/utils";

export function PreferenceEditor({
  allTags,
  selected,
}: {
  allTags: Tag[];
  selected: Tag[];
}) {
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(selected.map((tag) => tag.id)),
  );
  const [saved, setSaved] = useState<Set<string>>(
    () => new Set(selected.map((tag) => tag.id)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    chosen.size !== saved.size || [...chosen].some((id) => !saved.has(id));

  const toggle = (id: string) => {
    setMessage(null);
    setChosen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    const ids = [...chosen];
    startTransition(async () => {
      const result = await savePreferences(ids);
      if (result.ok) {
        setSaved(new Set(ids));
        setMessage("Minat tersimpan.");
      } else {
        setMessage(result.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const active = chosen.has(tag.id);
          return (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => toggle(tag.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-card hover:border-brand-700 hover:text-brand-700",
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {tag.name}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Menyimpan..." : "Simpan minat"}
        </button>
        <p className="text-sm text-muted-foreground" role="status">
          {message ??
            (chosen.size === 0
              ? "Belum ada minat dipilih."
              : `${chosen.size} minat dipilih.`)}
        </p>
      </div>
    </div>
  );
}
