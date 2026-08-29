/**
 * Seat grid for the booking page.
 *
 * The database records which seat *numbers* have been claimed on a flight, and
 * nothing else about the cabin — there is no capacity, aircraft, or layout
 * column anywhere in `flight_options`. So the grid itself is a convention: a
 * single-aisle 3-3 cabin, the layout almost every domestic narrow-body uses.
 *
 * What is real is which seats are already gone. `available_seats` is a separate
 * inventory counter that is decremented for every ticket, including passengers
 * who never picked a seat, so it deliberately is not used to size this grid —
 * the two numbers cannot be reconciled, and inventing the reconciliation would
 * put a wrong cabin on screen. The API stays the authority on whether a seat
 * can still be taken.
 */

export const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** Where the aisle falls: after the third letter, as in 3-3. */
export const AISLE_AFTER = 2;

export const SEAT_ROWS = 30;

export type SeatLetter = (typeof SEAT_LETTERS)[number];

export function seatNumber(row: number, letter: SeatLetter): string {
  return `${row}${letter}`;
}

/** Every seat in the cabin, row by row. */
export function cabinRows(): number[] {
  return Array.from({ length: SEAT_ROWS }, (_, i) => i + 1);
}

/**
 * A window seat is the first or last letter of the row; the middle of each
 * triple is the one nobody wants. Used only to label the legend.
 */
export function seatKind(letter: SeatLetter): "jendela" | "lorong" | "tengah" {
  const i = SEAT_LETTERS.indexOf(letter);
  if (i === 0 || i === SEAT_LETTERS.length - 1) return "jendela";
  if (i === AISLE_AFTER || i === AISLE_AFTER + 1) return "lorong";
  return "tengah";
}
