"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedDouble, Clock, Map, Mountain, Plane, Search } from "lucide-react";
import { quickLinks } from "@/lib/home-data";

const icons = {
  destination: Mountain,
  hotel: BedDouble,
  flight: Plane,
  crowd: Map,
  time: Clock,
} as const;

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const search = params.toString();
    router.push(search ? `/destinations?${search}` : "/destinations");
  }

  return (
    <section>
      <div className="container-page py-10 sm:py-14">
        <h1 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Ke mana?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          Cari destinasi, lihat kepadatannya, lalu pilih waktu kunjungan yang
          paling nyaman.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-card focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/20"
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <label htmlFor="hero-search" className="sr-only">
            Cari destinasi, kota, atau taman nasional
          </label>
          <input
            id="hero-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Destinasi, kota, atau taman nasional..."
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900"
          >
            Cari
          </button>
        </form>

        <nav
          aria-label="Pintasan"
          className="mt-5 flex flex-wrap justify-center gap-2"
        >
          {quickLinks.map((link) => {
            const Icon = icons[link.icon];
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 hover:text-brand-700"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
