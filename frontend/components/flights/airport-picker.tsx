"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Search, type LucideIcon } from "lucide-react";
import { POPULAR_CODES, type Airport } from "@/lib/airports";
import {
  AnchoredPanel,
  useAnchoredPanel,
} from "@/components/ui/anchored-panel";
import { cn } from "@/lib/utils";

/**
 * Airport field with a searchable list, the shape every travel search uses:
 * type a city, an airport name, or a three-letter code and the list narrows.
 *
 * A native `<select>` cannot do that — it matches only the option label, and on
 * a list this long the reader is left scrolling for Labuan Bajo.
 */

const PANEL_HEIGHT = 380;

export function AirportPicker({
  value,
  onChange,
  airports,
  label,
  icon: Icon,
  /** The airport chosen on the other side, flagged so the pair stays valid. */
  counterpart,
}: {
  value: string;
  onChange: (code: string) => void;
  airports: Airport[];
  label: string;
  icon: LucideIcon;
  counterpart?: string;
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

  const selected = airports.find((entry) => entry.code === value) ?? null;
  const groups = useMemo(() => grouped(airports, query), [airports, query]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // A fresh search starts at the top of whatever it matched.
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

  const choose = (code: string) => {
    onChange(code);
    close();
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((previous) => (previous + step + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = flat[active];
      if (pick) choose(pick.code);
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
        className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-brand-tint/10"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold">
            {selected ? `${selected.city} (${selected.code})` : value}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {selected?.name ?? "Pilih bandara"}
          </span>
        </span>
      </button>

      {open && (
        <AnchoredPanel
          anchor={anchor}
          panelRef={panelRef}
          label={`Pilih ${label.toLowerCase()}`}
          className="p-2"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Cari kota, bandara, atau kode"
              aria-label={`Cari ${label.toLowerCase()}`}
              aria-controls={listId}
              aria-activedescendant={
                flat[active] ? `${listId}-${flat[active].code}` : undefined
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Tidak ada bandara yang cocok dengan &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              className="mt-1 max-h-72 overflow-y-auto"
            >
              {groups.map((group) => (
                // Groups keep the listbox valid: options stay inside a role
                // the spec allows, and the heading is not read as an option.
                <li
                  key={group.title}
                  role="group"
                  aria-label={group.title || label}
                >
                  {group.title && (
                    <p className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </p>
                  )}
                  <ul role="none">
                    {group.items.map((entry) => {
                      const index = flat.indexOf(entry);
                      const isActive = index === active;
                      const isSelected = entry.code === value;
                      const isCounterpart = entry.code === counterpart;

                      return (
                        <li key={entry.code} role="none">
                          <button
                            id={`${listId}-${entry.code}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            data-active={isActive}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => choose(entry.code)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                              isActive && "bg-brand-tint/10",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {entry.city}
                                {isCounterpart && (
                                  <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">
                                    · akan ditukar
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {entry.name} &middot; {entry.province}
                              </span>
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-brand-700" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </AnchoredPanel>
      )}
    </div>
  );
}

type Group = { title: string; items: Airport[] };

/**
 * Empty search opens on the busy airports; typing drops the grouping and ranks
 * by how directly the entry matches — a code typed in full comes first, then
 * names that start with the query, then anything that merely contains it.
 */
function grouped(airports: Airport[], query: string): Group[] {
  const term = query.trim().toLowerCase();

  if (term === "") {
    const popular = POPULAR_CODES.map((code) =>
      airports.find((entry) => entry.code === code),
    ).filter((entry): entry is Airport => entry !== undefined);

    const rest = byCity(
      airports.filter((entry) => !POPULAR_CODES.includes(entry.code)),
    );

    return [
      ...(popular.length > 0 ? [{ title: "Kota populer", items: popular }] : []),
      ...(rest.length > 0 ? [{ title: "Semua bandara", items: rest }] : []),
    ];
  }

  const matched = airports
    .map((entry) => ({ entry, rank: rank(entry, term) }))
    .filter(({ rank }) => rank !== null)
    .sort(
      (a, b) =>
        (a.rank ?? 0) - (b.rank ?? 0) ||
        a.entry.city.localeCompare(b.entry.city, "id"),
    )
    .map(({ entry }) => entry);

  return matched.length > 0 ? [{ title: "", items: matched }] : [];
}

function rank(entry: Airport, term: string): number | null {
  const code = entry.code.toLowerCase();
  const city = entry.city.toLowerCase();
  const name = entry.name.toLowerCase();
  const province = entry.province.toLowerCase();

  if (code === term) return 0;
  if (city.startsWith(term)) return 1;
  if (code.startsWith(term)) return 2;
  if (name.startsWith(term)) return 3;
  if (city.includes(term) || name.includes(term)) return 4;
  if (province.includes(term)) return 5;
  return null;
}

function byCity(airports: Airport[]): Airport[] {
  return [...airports].sort((a, b) => a.city.localeCompare(b.city, "id"));
}
