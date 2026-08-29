/**
 * Date helpers shared by every month-grid picker.
 *
 * All of these work on `YYYY-MM-DD` strings in local time rather than `Date`
 * objects in UTC: a date control that jumps a day either side of midnight is
 * worse than no date control, and every date the APIs exchange is a plain
 * calendar day with no zone attached.
 */

export const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local today, not UTC. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `YYYY-MM` shifted by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The month laid out Monday-first, with leading blanks so every date sits
 * under its weekday.
 */
export function monthCells(month: string): (string | null)[] {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(year, index - 1, 1);
  // getDay() is Sunday-first; Indonesian calendars start on Monday.
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, index, 0).getDate();

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
}

export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/** `3 Sep 2026` — a field's headline line. */
export function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `Kamis` — a field's supporting line. */
export function weekdayName(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { weekday: "long" });
}

/** `Kam, 3 Sep 2026` — spoken form, for a day cell's accessible name. */
export function longDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole nights between two `YYYY-MM-DD` days; at least one. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const from = new Date(`${checkIn}T00:00:00`).getTime();
  const to = new Date(`${checkOut}T00:00:00`).getTime();
  const nights = Math.round((to - from) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}
