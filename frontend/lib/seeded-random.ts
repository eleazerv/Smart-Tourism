/**
 * Deterministic pseudo-randomness, keyed by a string.
 *
 * The hotel and flight catalogues have no tables behind them yet, so their
 * rows are generated rather than stored. Generating them from a seed — the
 * same trick `photo()` uses for placeholder imagery — keeps every render, every
 * page of results, and the server and client all in agreement, which a plain
 * `Math.random()` could not do.
 */

/** FNV-1a, for turning a seed string into a 32-bit integer. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number;
  /** One entry from the list. */
  pick: <T>(items: readonly T[]) => T;
  /** `count` distinct entries, in list order. */
  sample: <T>(items: readonly T[], count: number) => T[];
  /** True with the given probability. */
  chance: (probability: number) => boolean;
};

/** mulberry32 — small, fast, and good enough for placeholder catalogues. */
export function rng(seed: string): Rng {
  let state = hash(seed);

  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];

  const sample = <T,>(items: readonly T[], count: number): T[] => {
    // Walks the list once and keeps entries by weighted coin flip, so the
    // result stays in source order and never repeats an entry.
    const out: T[] = [];
    let remaining = Math.min(count, items.length);
    for (let i = 0; i < items.length && remaining > 0; i++) {
      if (next() < remaining / (items.length - i)) {
        out.push(items[i]);
        remaining--;
      }
    }
    return out;
  };

  return { next, int, pick, sample, chance: (p) => next() < p };
}

/** Rounds to a tidy figure, the way published fares and rates are quoted. */
export function roundPrice(value: number, step = 1000): number {
  return Math.round(value / step) * step;
}

/** `Rp 1.250.000` */
export function formatIDR(value: number): string {
  return `Rp${value.toLocaleString("id-ID")}`;
}
