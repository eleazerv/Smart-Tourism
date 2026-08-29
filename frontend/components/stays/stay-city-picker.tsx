"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import type { CityFacet } from "@/lib/stays-search";
import { cn } from "@/lib/utils";

/**
 * City field with a searchable list, matching the airport field on the flight
 * search. The whole field is the trigger, so a tap anywhere in it opens the
 * list rather than only a tap on a native control.
 *
 * A `<select>` would match only the option label, and with thirty-odd cities
 * carrying their province the reader ends up scrolling for Labuan Bajo.
 */

const PANEL_HEIGHT = 380;

/** The "anywhere" row, kept out of the city list itself. */
const ALL = 0;

export function StayCityPicker({
  value,
  onChange,
  cities,
}: {
  /** City id, or `null` for every city. */
  value: number | null;
  onChange: (cityId: number | null) => void;
  cities: CityFacet[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, anchor } = useAnchoredPanel({
    open,
    onClose: close,
    height: PANEL_HEIGHT,
    minWidth: 300,
  });

  const selected = cities.find((city) => city.id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(q) ||
        city.province.toLowerCase().includes(q),
    );
  }, [cities, query]);

  // Index 0 is the "every city" row; the cities follow it.
  const options = useMemo(
    () => [ALL, ...matches.map((city) => city.id)],
    [matches],
  );

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // The field is a button; the reader still expects to be able to type.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (cityId: number) => {
    onChange(cityId === ALL ? null : cityId);
    close();
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((previous) => (previous + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = options[active];
      if (pick !== undefined) choose(pick);
    }
  };

  return (
    <div className="flex min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
      >
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Kota atau area
          </span>
          <span className="block truncate text-sm font-semibold">
            {selected ? selected.name : "Semua kota"}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {selected
              ? selected.province || `${selected.count} penginapan`
              : `${cities.length} kota tersedia`}
          </span>
        </span>
      </button>

      {open && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label="Pilih kota"
          className="p-2"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder="Cari kota atau provinsi"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="mt-1.5 max-h-72 overflow-y-auto scrollbar-quiet"
          >
            <Option
              active={options[active] === ALL}
              selected={value === null}
              title="Semua kota"
              subtitle={`${cities.length} kota tersedia`}
              onSelect={() => choose(ALL)}
              onHover={() => setActive(0)}
            />

            {matches.map((city, index) => (
              <Option
                key={city.id}
                active={options[active] === city.id}
                selected={city.id === value}
                title={city.name}
                subtitle={city.province}
                hint={`${city.count}`}
                onSelect={() => choose(city.id)}
                onHover={() => setActive(index + 1)}
              />
            ))}

            {matches.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada kota yang cocok.
              </li>
            )}
          </ul>
        </AnchoredPanel>
      )}
    </div>
  );
}

function Option({
  active,
  selected,
  title,
  subtitle,
  hint,
  onSelect,
  onHover,
}: {
  active: boolean;
  selected: boolean;
  title: string;
  subtitle?: string;
  hint?: string;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <li role="option" aria-selected={selected} data-active={active}>
      <button
        type="button"
        onClick={onSelect}
        onMouseMove={onHover}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition",
          active && "bg-brand-tint/10 dark:bg-brand-tint/15",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{title}</span>
          {subtitle && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        {hint && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {hint}
          </span>
        )}
        {selected && (
          <Check className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-100" />
        )}
      </button>
    </li>
  );
}
