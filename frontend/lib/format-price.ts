/**
 * `1,2 jt` / `850 rb` — for cells too narrow to carry a full rupiah figure,
 * like a day in the price calendar.
 */
export function shortIDR(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1).replace(".", ",")} jt`;
  }
  return `${Math.round(price / 1000)} rb`;
}
