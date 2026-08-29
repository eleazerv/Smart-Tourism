/**
 * One function per Express route. Keep the argument names aligned with the
 * query parameters documented in `backend/router/*.js` so the Swagger page at
 * http://localhost:4000/api-docs stays the single source of truth.
 */
import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  Accommodation,
  AccommodationAvailability,
  AccommodationReview,
  AccommodationTier,
  ChatMessage,
  ChatRoom,
  ChatTurn,
  CheckoutResult,
  City,
  Destination,
  DestinationDetail,
  EventItem,
  FlightBooking,
  FlightBookingSummary,
  FlightCalendarDay,
  FlightDetail,
  FlightOption,
  HeatmapEntry,
  NearbyAccommodation,
  PaymentIntent,
  Paginated,
  PersonalRecommendations,
  Profile,
  Review,
  SavedDestination,
  SeasonalRecommendations,
  Tag,
  TrendingDestination,
  TripCanvas,
} from "@/lib/api/types";

type Auth = Pick<ApiFetchOptions, "token" | "signal">;

/* ---------------------------------------------------------------- tags --- */

export async function getTags(): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/tags");
  return data;
}

/* -------------------------------------------------------- destinations --- */

export type DestinationQuery = {
  q?: string;
  /** Tag slugs, comma-separated — e.g. `"pantai,diving"`. */
  tags?: string;
  province_id?: number;
  city_id?: number;
  page?: number;
};

/** Both catalogue routes answer 404 for "no matches", normalised to this. */
const EMPTY_PAGE = {
  data: [],
  page: 1,
  total: 0,
  total_pages: 0,
} satisfies Paginated<never>;

export async function searchDestinations(
  query: DestinationQuery = {},
): Promise<Paginated<Destination>> {
  // getDestinations() answers 404 rather than an empty page when nothing
  // matches, so "no results" has to be normalised back into an empty list.
  const page = await apiFetch<Paginated<Destination>>("/api/destinations", {
    query,
    nullOn404: true,
  });
  return page ?? { ...EMPTY_PAGE, page: query.page ?? 1 };
}

export async function getDestination(
  id: string,
): Promise<DestinationDetail | null> {
  const result = await apiFetch<{ data: DestinationDetail }>(
    `/api/destinations/${id}`,
    { nullOn404: true },
  );
  return result?.data ?? null;
}

/**
 * Walks the paginated list until exhausted, so callers can rank across the
 * whole catalogue instead of within one arbitrary page. `/api/destinations`
 * returns 15 rows per page and orders by region, not popularity.
 *
 * Capped so a growing catalogue cannot turn one render into dozens of
 * round-trips — call it from a `"use cache"` scope.
 */
export async function getAllDestinations(maxPages = 5): Promise<Destination[]> {
  const first = await searchDestinations({ page: 1 });
  const pages = Math.min(first.total_pages, maxPages);

  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      searchDestinations({ page: i + 2 }),
    ),
  );

  return [first, ...rest].flatMap((page) => page.data);
}

export type TrendingPeriod = "7d" | "30d" | "all";

export async function getTrendingDestinations(
  period: TrendingPeriod = "7d",
): Promise<TrendingDestination[]> {
  const { data } = await apiFetch<{
    data: TrendingDestination[];
    period: TrendingPeriod;
  }>("/api/destinations/trending", { query: { period } });
  return data;
}

/** Fire-and-forget view counter; deduped server-side for 24h per user/IP. */
export async function trackDestinationView(id: string, auth: Auth = {}) {
  return apiFetch<{ tracked: boolean; message?: string }>(
    `/api/destinations/${id}/view`,
    { method: "POST", ...auth },
  );
}

/* -------------------------------------------------------------- events --- */

export async function getEvents(
  query: { month?: number; province_id?: number; city_id?: number } = {},
): Promise<EventItem[]> {
  const { data } = await apiFetch<{ data: EventItem[] }>("/api/events", {
    query,
  });
  return data;
}

export async function getEvent(id: string): Promise<EventItem | null> {
  const result = await apiFetch<{ data: EventItem }>(`/api/events/${id}`, {
    nullOn404: true,
  });
  return result?.data ?? null;
}

/* ------------------------------------------------------------- heatmap --- */

/** @param period `YYYY-MM`; omitted falls back to the latest period on record. */
export async function getHeatmap(period?: string): Promise<HeatmapEntry[]> {
  const { data } = await apiFetch<{ data: HeatmapEntry[] }>("/api/heatmap", {
    query: { period },
  });
  return data;
}

/* ----------------------------------------------------- recommendations --- */

export async function getSeasonalRecommendations(
  query: { month?: number; province_id?: number } = {},
): Promise<SeasonalRecommendations> {
  return apiFetch<SeasonalRecommendations>("/api/recommendations", { query });
}

export async function getPersonalRecommendations(
  auth: Auth,
): Promise<PersonalRecommendations> {
  return apiFetch<PersonalRecommendations>("/api/recommendations/for-you", auth);
}

/* ------------------------------------------------- profile & preferences --- */

export async function getProfile(auth: Auth): Promise<Profile | null> {
  // getMe() keys the body as `user`, not `data` like every other controller.
  const result = await apiFetch<{ user: Profile }>("/api/auth/me", {
    ...auth,
    nullOn404: true,
  });
  return result?.user ?? null;
}

/** Only the display name is editable today; the API ignores anything else. */
export async function updateProfile(
  input: { full_name: string },
  auth: Auth,
): Promise<Profile> {
  const { user } = await apiFetch<{ user: Profile }>("/api/auth/me", {
    ...auth,
    method: "PATCH",
    body: input,
  });
  return user;
}

export async function getPreferences(auth: Auth): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/preferences", auth);
  return data;
}

/** Replaces the whole preference set — this is a PUT, not an append. */
export async function updatePreferences(
  tagIds: string[],
  auth: Auth,
): Promise<Tag[]> {
  const { data } = await apiFetch<{ data: Tag[] }>("/api/preferences", {
    ...auth,
    method: "PUT",
    body: { tag_ids: tagIds },
  });
  return data;
}

/* ------------------------------------------------------- accommodations --- */

export type AccommodationQuery = {
  city_id?: number;
  province_id?: number;
  tier?: AccommodationTier;
  q?: string;
  min_rating?: number;
  page?: number;
};

export async function searchAccommodations(
  query: AccommodationQuery = {},
): Promise<Paginated<Accommodation>> {
  // Like /api/destinations, this route answers 404 rather than an empty page.
  const page = await apiFetch<Paginated<Accommodation>>(
    "/api/accommodations",
    { query, nullOn404: true },
  );
  return page ?? { ...EMPTY_PAGE, page: query.page ?? 1 };
}

/**
 * Walks `/api/accommodations` to the end. The route sorts by rating only and
 * cannot filter on price, capacity, or anything else `/hotels` offers, so the
 * page has to hold the whole set to filter, sort, and count facets over it.
 */
export async function getAllAccommodations(
  query: Omit<AccommodationQuery, "page"> = {},
  maxPages = 40,
): Promise<Accommodation[]> {
  const first = await searchAccommodations({ ...query, page: 1 });
  const pages = Math.min(first.total_pages, maxPages);

  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      searchAccommodations({ ...query, page: i + 2 }),
    ),
  );

  return [first, ...rest].flatMap((page) => page.data);
}

export async function getAccommodation(
  id: string,
): Promise<Accommodation | null> {
  const result = await apiFetch<{ data: Accommodation }>(
    `/api/accommodations/${id}`,
    { nullOn404: true },
  );
  return result?.data ?? null;
}

/**
 * Rooms free across the requested nights. Both dates are required and
 * `check_out` must be after `check_in`; the API answers 400 otherwise.
 */
export async function getAccommodationAvailability(
  id: string,
  range: { check_in: string; check_out: string },
): Promise<AccommodationAvailability> {
  const { data } = await apiFetch<{ data: AccommodationAvailability }>(
    `/api/accommodations/${id}/availability`,
    { query: range },
  );
  return data;
}

export async function getAccommodationReviews(
  id: string,
  options: { sort?: "recent" | "rating" } & Auth = {},
): Promise<AccommodationReview[]> {
  const { sort = "recent", ...auth } = options;
  const { data } = await apiFetch<{ data: AccommodationReview[] }>(
    `/api/accommodations/${id}/reviews`,
    { query: { sort }, ...auth },
  );
  return data;
}

export async function createAccommodationReview(
  id: string,
  input: { rating: number; comment?: string; photo?: File },
  auth: Auth,
): Promise<AccommodationReview> {
  // The route runs through multer, so the body must be multipart even when
  // there is no photo attached.
  const form = new FormData();
  form.set("rating", String(input.rating));
  if (input.comment) form.set("comment", input.comment);
  if (input.photo) form.set("photo", input.photo);

  const { data } = await apiFetch<{ data: AccommodationReview }>(
    `/api/accommodations/${id}/reviews`,
    { ...auth, method: "POST", body: form },
  );
  return data;
}

export async function deleteAccommodationReview(
  reviewId: string,
  auth: Auth,
) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/accommodations/reviews/${reviewId}`,
    { ...auth, method: "DELETE" },
  );
}

/* --------------------------------------------------- saved destinations --- */

/**
 * Flips the save on or off in one call — the API decides which, so the
 * response is the state to trust rather than the one the caller assumed.
 */
export async function toggleSavedDestination(
  destinationId: string,
  auth: Auth,
): Promise<{ saved: boolean }> {
  return apiFetch<{ saved: boolean }>(
    `/api/destinations/${destinationId}/save`,
    { ...auth, method: "POST" },
  );
}

export async function listSavedDestinations(
  auth: Auth,
): Promise<SavedDestination[]> {
  const { data } = await apiFetch<{ data: SavedDestination[] }>(
    "/api/saved-destinations",
    auth,
  );
  return data;
}

/* ------------------------------------------------------------- reviews --- */

export async function getReviews(
  destinationId: string,
  options: { sort?: "recent" | "likes" } & Auth = {},
): Promise<Review[]> {
  const { sort = "recent", ...auth } = options;
  const { data } = await apiFetch<{ data: Review[] }>(
    `/api/destinations/${destinationId}/reviews`,
    { query: { sort }, ...auth },
  );
  return data;
}

/**
 * Review totals for a page of cards, keyed by destination id. The catalogue
 * listing carries `avg_rating` but no count, and asking per destination would
 * be one request per card.
 */
export async function getReviewCounts(
  destinationIds: string[],
  options: ApiFetchOptions = {},
): Promise<Record<string, number>> {
  if (destinationIds.length === 0) return {};
  const { data } = await apiFetch<{ data: Record<string, number> }>(
    "/api/destinations/review-counts",
    { query: { ids: destinationIds.join(",") }, ...options },
  );
  return data;
}

export async function createReview(
  destinationId: string,
  input: { rating: number; comment?: string; photo?: File },
  auth: Auth,
): Promise<Review> {
  // The route runs through multer, so the body must be multipart even when
  // there is no photo attached.
  const form = new FormData();
  form.set("rating", String(input.rating));
  if (input.comment) form.set("comment", input.comment);
  if (input.photo) form.set("photo", input.photo);

  const { data } = await apiFetch<{ data: Review }>(
    `/api/destinations/${destinationId}/reviews`,
    { ...auth, method: "POST", body: form },
  );
  return data;
}

export async function deleteReview(reviewId: string, auth: Auth) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/destinations/reviews/${reviewId}`,
    { ...auth, method: "DELETE" },
  );
}

export async function likeReview(reviewId: string, auth: Auth) {
  return apiFetch<{ liked: boolean }>(
    `/api/destinations/reviews/${reviewId}/like`,
    { ...auth, method: "POST" },
  );
}

/* ------------------------------------------------------------- flights --- */

export type FlightQuery = {
  origin_city_id: number;
  destination_city_id: number;
  /** `YYYY-MM-DD`. */
  date: string;
  sort?: "price" | "departure_time";
};

/** A route with nothing scheduled answers 404, which is an empty day here. */
export async function searchFlights(query: FlightQuery): Promise<FlightOption[]> {
  const result = await apiFetch<{ data: FlightOption[] }>("/api/flights", {
    query,
    nullOn404: true,
  });
  return result?.data ?? [];
}

/**
 * Cheapest fare per day across one month, for the date strip above the results.
 * Days with no flight come back with a null price.
 */
export async function getFlightsCalendar(query: {
  origin_city_id: number;
  destination_city_id: number;
  /** `YYYY-MM`. Defaults to the current month on the API side. */
  month?: string;
}): Promise<FlightCalendarDay[]> {
  const result = await apiFetch<{ data: FlightCalendarDay[] }>(
    "/api/flights/calendar",
    { query, nullOn404: true },
  );
  return result?.data ?? [];
}

export async function getFlight(id: string): Promise<FlightDetail | null> {
  const result = await apiFetch<{ data: FlightDetail }>(`/api/flights/${id}`, {
    nullOn404: true,
  });
  return result?.data ?? null;
}

/* ------------------------------------------------------ flight bookings --- */

export type FlightBookingItemInput = {
  flight_option_id: string;
  flight_type: "outbound" | "return";
};

/**
 * One booking covers one passenger and one or two flights. Seats are held the
 * moment this succeeds, before any payment — see the route's Swagger note.
 */
/**
 * One ticket is issued per name per leg, so `passengerNames` also decides how
 * many seats come out of inventory. The API requires 1–10 non-empty names.
 */
export async function createFlightBooking(
  items: FlightBookingItemInput[],
  passengerNames: string[],
  auth: Auth,
): Promise<FlightBooking> {
  const { data } = await apiFetch<{ data: FlightBooking }>(
    "/api/flight-bookings",
    {
      ...auth,
      method: "POST",
      body: { items, passenger_names: passengerNames },
    },
  );
  return data;
}

/** Seat numbers already claimed on a flight, for greying out the seat map. */
export async function getTakenSeats(flightId: string): Promise<string[]> {
  const { taken_seats } = await apiFetch<{ taken_seats: string[] }>(
    `/api/flights/${flightId}/seats`,
  );
  return taken_seats;
}

/**
 * Claims one seat for one ticket. Only works while the booking is still
 * active, so it has to run between creating the booking and paying for it.
 */
export async function claimFlightSeat(
  bookingId: string,
  ticketId: string,
  seatNumber: string,
  auth: Auth,
): Promise<{ seat_number: string }> {
  const { data } = await apiFetch<{ data: { seat_number: string } }>(
    `/api/flight-bookings/${bookingId}/tickets/${ticketId}/seat`,
    { ...auth, method: "POST", body: { seat_number: seatNumber } },
  );
  return data;
}

export async function listFlightBookings(
  auth: Auth,
): Promise<FlightBookingSummary[]> {
  const { data } = await apiFetch<{ data: FlightBookingSummary[] }>(
    "/api/flight-bookings",
    auth,
  );
  return data;
}

export async function getFlightBooking(
  id: string,
  auth: Auth,
): Promise<FlightBooking | null> {
  const result = await apiFetch<{ data: FlightBooking }>(
    `/api/flight-bookings/${id}`,
    { ...auth, nullOn404: true },
  );
  return result?.data ?? null;
}

/** Opens (or re-opens) a Xendit invoice. Send the reader to `invoice_url`. */
export async function payFlightBooking(
  id: string,
  auth: Auth,
): Promise<PaymentIntent> {
  const { data } = await apiFetch<{ data: PaymentIntent }>(
    `/api/flight-bookings/${id}/pay`,
    { ...auth, method: "POST" },
  );
  return data;
}

/** Releases the held seats. Only works while the booking is still unpaid. */
export async function cancelFlightBooking(id: string, auth: Auth) {
  await apiFetch(`/api/flight-bookings/${id}/cancel`, {
    ...auth,
    method: "POST",
  });
}

/* ------------------------------------------------- AI trip planner --- */

export async function listChatRooms(auth: Auth): Promise<ChatRoom[]> {
  const { data } = await apiFetch<{ data: ChatRoom[] }>("/api/chat/rooms", auth);
  return data ?? [];
}

/** Membuat ruang percakapan sekaligus draft rencana yang menempel padanya. */
export async function createChatRoom(auth: Auth): Promise<ChatRoom> {
  const { data } = await apiFetch<{ data: ChatRoom }>("/api/chat/rooms", {
    ...auth,
    method: "POST",
  });
  return data;
}

export async function getChatRoom(
  id: string,
  auth: Auth,
): Promise<{
  room: ChatRoom;
  messages: ChatMessage[];
  canvas: TripCanvas;
} | null> {
  const result = await apiFetch<{
    data: { room: ChatRoom; messages: ChatMessage[]; canvas: TripCanvas };
  }>(`/api/chat/rooms/${id}`, { ...auth, nullOn404: true });
  return result?.data ?? null;
}

/**
 * Satu giliran bisa memanggil beberapa tool katalog berturut-turut, jadi
 * balasannya wajar memakan belasan detik. Panggil dengan `signal` kalau
 * penggunanya boleh membatalkan.
 */
export async function sendChatMessage(
  roomId: string,
  message: string,
  auth: Auth,
): Promise<ChatTurn> {
  const { data } = await apiFetch<{ data: ChatTurn }>(
    `/api/chat/rooms/${roomId}/messages`,
    { ...auth, method: "POST", body: { message } },
  );
  return data;
}

/** Mengubah isi rencana jadi booking sungguhan, semuanya berstatus pending. */
export async function checkoutTrip(
  roomId: string,
  auth: Auth,
): Promise<CheckoutResult> {
  const { data } = await apiFetch<{ data: CheckoutResult }>(
    `/api/chat/rooms/${roomId}/checkout`,
    { ...auth, method: "POST" },
  );
  return data;
}

/** Daftar kota, urut abjad. Dipakai pemilih rute penerbangan di panel rencana. */
export async function listCities(): Promise<City[]> {
  const { data } = await apiFetch<{ data: City[] }>("/api/cities");
  return data ?? [];
}

/**
 * Penginapan di kota destinasi ini, terdekat lebih dulu. Dipakai panel rencana
 * untuk memilih penginapan tanpa harus lewat percakapan.
 */
export async function getDestinationAccommodations(
  destinationId: string,
  options: { tier?: AccommodationTier } & Auth = {},
): Promise<NearbyAccommodation[]> {
  const { tier, ...auth } = options;
  const { data } = await apiFetch<{ data: NearbyAccommodation[] }>(
    `/api/destinations/${destinationId}/accommodations`,
    { query: { tier }, ...auth },
  );
  return data ?? [];
}

export async function getTripCanvas(
  tripId: string,
  auth: Auth,
): Promise<TripCanvas | null> {
  const result = await apiFetch<{ data: TripCanvas }>(`/api/trips/${tripId}`, {
    ...auth,
    nullOn404: true,
  });
  return result?.data ?? null;
}

export async function updateTrip(
  tripId: string,
  patch: {
    name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    travelers?: number;
    origin_city_id?: number | null;
  },
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}`,
    { ...auth, method: "PATCH", body: patch },
  );
  return data;
}

/**
 * Semua endpoint di bawah membalas canvas utuh, bukan baris yang berubah saja,
 * jadi pemanggilnya cukup mengganti seluruh state rencana dengan hasilnya.
 */
export async function addTripItem(
  tripId: string,
  destinationId: string,
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}/items`,
    { ...auth, method: "POST", body: { destination_id: destinationId } },
  );
  return data;
}

export async function updateTripItem(
  tripId: string,
  itemId: string,
  patch: {
    status?: "suggested" | "confirmed";
    accommodation_id?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    guests?: number;
    notes?: string | null;
  },
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}/items/${itemId}`,
    { ...auth, method: "PATCH", body: patch },
  );
  return data;
}

export async function removeTripItem(
  tripId: string,
  itemId: string,
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}/items/${itemId}`,
    { ...auth, method: "DELETE" },
  );
  return data;
}

/** Slot berangkat & pulang masing-masing cuma satu: ini mengganti, bukan menambah. */
export async function setTripFlight(
  tripId: string,
  body: { flight_option_id: string; flight_type: "outbound" | "return" },
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}/flights`,
    { ...auth, method: "PUT", body },
  );
  return data;
}

export async function removeTripFlight(
  tripId: string,
  type: "outbound" | "return",
  auth: Auth,
): Promise<TripCanvas> {
  const { data } = await apiFetch<{ data: TripCanvas }>(
    `/api/trips/${tripId}/flights/${type}`,
    { ...auth, method: "DELETE" },
  );
  return data;
}
