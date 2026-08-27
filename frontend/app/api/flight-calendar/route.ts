import { NextResponse } from "next/server";
import { getFlightsCalendar } from "@/lib/api";

/**
 * Same-origin passthrough to `GET /api/flights/calendar`.
 *
 * The date picker needs prices for whatever month and route the reader is
 * looking at, which only the browser knows — and the Express API answers with
 * a CORS origin no browser matches, so the call is made from the server here
 * instead.
 */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function cityId(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const origin = cityId(searchParams.get("origin_city_id"));
  const destination = cityId(searchParams.get("destination_city_id"));
  const month = searchParams.get("month");

  if (origin === null || destination === null) {
    return NextResponse.json(
      { error: "invalid_query", data: [] },
      { status: 400 },
    );
  }
  if (month !== null && !MONTH.test(month)) {
    return NextResponse.json(
      { error: "invalid_month", data: [] },
      { status: 400 },
    );
  }

  try {
    const data = await getFlightsCalendar({
      origin_city_id: origin,
      destination_city_id: destination,
      ...(month ? { month } : {}),
    });
    return NextResponse.json({ data });
  } catch {
    // The picker still works without prices, so this is not fatal for it.
    return NextResponse.json({ error: "upstream_error", data: [] }, {
      status: 502,
    });
  }
}
