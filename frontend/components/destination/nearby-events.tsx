import { cacheLife } from "next/cache";
import { CalendarClock, PartyPopper } from "lucide-react";
import { getEvents, type EventItem } from "@/lib/api";
import { MONTHS, formatDate } from "@/lib/destination-data";

const SHOWN = 4;

async function loadEvents(cityId: number) {
  "use cache";
  cacheLife("hours");
  return getEvents({ city_id: cityId });
}

/**
 * Agenda in the same city. `/api/events` filters by city, not by destination,
 * so this is "what else is on while you are there" rather than events held at
 * this exact spot.
 */
export async function NearbyEvents({
  cityId,
  cityName,
}: {
  cityId: number;
  cityName: string;
}) {
  let events: EventItem[];
  try {
    events = await loadEvents(cityId);
  } catch {
    return null;
  }

  if (events.length === 0) return null;

  // Lead with the months still ahead this year, then wrap around, so a page
  // opened in November does not open with January's festival.
  const current = new Date().getMonth() + 1;
  const ordered = [...events].sort((a, b) => rank(a, current) - rank(b, current));

  return (
    <section id="agenda" className="scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <PartyPopper className="h-5 w-5 text-brand-700 dark:text-brand-100" />
        Agenda di {cityName}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Acara yang bisa Anda selipkan ke dalam rencana perjalanan.
      </p>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {ordered.slice(0, SHOWN).map((event) => (
          <li
            key={event.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-100">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(event.start_date) ??
                (event.month ? MONTHS[event.month - 1] : "Tanggal menyusul")}
            </p>
            <p className="mt-1 font-semibold">{event.name}</p>
            {event.description && (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                {event.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Months already past this year sort after the ones still to come. */
function rank(event: EventItem, currentMonth: number) {
  if (event.month === null) return 99;
  return (event.month - currentMonth + 12) % 12;
}
