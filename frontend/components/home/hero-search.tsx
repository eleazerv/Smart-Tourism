"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Compass, Search, Ticket, Users } from "lucide-react";
import { searchTabs } from "@/lib/home-data";
import { cn } from "@/lib/utils";

const icons = {
  compass: Compass,
  activity: Ticket,
  crowd: Users,
  time: CalendarClock,
} as const;

export function HeroSearch() {
  const router = useRouter();
  const [active, setActive] = useState(searchTabs[0].id);
  const [query, setQuery] = useState("");

  const tab = searchTabs.find((t) => t.id === active) ?? searchTabs[0];

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    // Each mode owns its own view: browse, heatmap, or best-time advice.
    const search = params.toString();
    router.push(search ? `${tab.href}?${search}` : tab.href);
  }

  return (
    <section>
      <div className="container-page py-10 sm:py-14">
        <h1 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Ke mana?
        </h1>

        <div
          role="tablist"
          aria-label="Jenis pencarian"
          className="no-scrollbar mt-6 flex justify-start gap-1 overflow-x-auto sm:justify-center"
        >
          {searchTabs.map((t) => {
            const Icon = icons[t.icon];
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(t.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
                  selected
                    ? "text-brand-700 dark:text-brand-100"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-700 transition-opacity dark:bg-brand-100",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-5 flex max-w-2xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-card focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/20"
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <label htmlFor="hero-search" className="sr-only">
            {tab.placeholder}
          </label>
          <input
            id="hero-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab.placeholder}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-brand-50 transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
          >
            Cari
          </button>
        </form>
      </div>
    </section>
  );
}
