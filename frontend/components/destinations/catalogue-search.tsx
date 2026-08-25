"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { withFilter, type SearchState } from "@/lib/destinations-search";

/**
 * The catalogue's own search field. Submits by navigating, so the results
 * stay server-rendered and the query lands in a shareable URL.
 */
export function CatalogueSearch({ state }: { state: SearchState }) {
  const router = useRouter();
  const [value, setValue] = useState(state.q);

  // Keep the field in step with the URL when the reader clears a chip or
  // presses back — those change `state.q` without touching this input.
  useEffect(() => setValue(state.q), [state.q]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(withFilter(state, { q: value.trim() }));
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card py-1 pl-4 pr-1 shadow-sm focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/20 dark:focus-within:border-brand-100"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <label htmlFor="catalogue-search" className="sr-only">
        Cari destinasi, kota, atau taman nasional
      </label>
      <input
        id="catalogue-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Cari destinasi atau kota..."
        className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Kosongkan pencarian"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        className="shrink-0 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        Cari
      </button>
    </form>
  );
}
