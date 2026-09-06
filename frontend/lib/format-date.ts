/** "27 Agu 2026, 21.05" — timestamps the API returns with a zone. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Whether a payment deadline has passed — and so whether an invoice link is
 * still worth offering.
 *
 * Postgres returns these timestamps without a zone, so an unzoned value is
 * read as UTC, the same rule `bookingPayment.js` applies on the server. A
 * missing or unparseable deadline counts as passed: an invoice we cannot
 * vouch for should not be presented as live.
 */
export function deadlinePassed(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(expiresAt);
  const parsed = Date.parse(hasZone ? expiresAt : `${expiresAt}Z`);
  return Number.isNaN(parsed) || parsed <= Date.now();
}
