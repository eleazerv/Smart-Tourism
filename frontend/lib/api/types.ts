/**
 * Response shapes returned by the Express API in `backend/`.
 *
 * These mirror what the controllers actually serialise, not the raw Supabase
 * tables — e.g. `search_destinations` rows are flattened into nested
 * `provinces`/`cities` objects by destinations.Controller.js.
 */

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type ProvinceRef = {
  id: number;
  code: string;
  name: string;
};

export type CityRef = {
  id: number;
  name: string;
};

/** Shape from `GET /api/destinations` and `GET /api/recommendations`. */
export type Destination = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  avg_rating: number | null;
  view_count: number | null;
  provinces: ProvinceRef | null;
  cities: CityRef | null;
};

/**
 * Shape from `GET /api/destinations/:id` — the same columns as the list, plus
 * the foreign keys and the destination's tags, which only the detail
 * controller joins in.
 */
export type DestinationDetail = Destination & {
  province_id: number | null;
  city_id: number | null;
  tags: Tag[];
};

/** `GET /api/destinations/trending` selects a narrower column set. */
export type TrendingDestination = {
  id: string;
  name: string;
  cover_image_url: string | null;
  avg_rating: number | null;
  view_count: number | null;
  /** Only present for the `7d` / `30d` periods, not for `all`. */
  recent_views?: number;
};

export type Paginated<T> = {
  data: T[];
  page: number;
  total: number;
  total_pages: number;
};

export type EventItem = {
  id: string;
  name: string;
  month: number | null;
  start_date: string | null;
  description: string | null;
  cities: (CityRef & { province_id: number; provinces: ProvinceRef }) | null;
};

export type HeatmapEntry = {
  province_code: string;
  province_name: string;
  visitor_count: number;
};

/**
 * Both recommendation routes select a narrower column set than the catalogue
 * does — no `latitude`/`longitude`. Spelled out so callers cannot reach for
 * coordinates that never arrive.
 */
export type RecommendedDestination = Omit<
  Destination,
  "latitude" | "longitude"
>;

/** One province's climate pattern for the requested month. */
export type SeasonInfo = {
  province: ProvinceRef;
  /** `"kemarau"` or `"hujan"` in the seeded data. */
  season: string;
  /** Free-text activity slugs, e.g. `["diving", "snorkeling"]`. */
  recommended_activities: string[];
};

export type SeasonalRecommendations = {
  month: number;
  /** One entry per province whose climate pattern covers the month; empty
   *  when none does. Keyed `season_info` by the controller, not `season_summary`. */
  season_info: SeasonInfo[];
  province_id: number | null;
  destinations: RecommendedDestination[];
};

export type PersonalRecommendations = {
  preference_tags: Tag[];
  /** Set by the controller when the user has no preferences saved yet. */
  message?: string;
  destinations: (RecommendedDestination & {
    match_score: number;
    matched_tags: Tag[];
  })[];
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

/** Author block joined onto every review by `REVIEW_FIELDS` in the controller. */
export type ReviewAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type Review = {
  id: string;
  destination_id: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  /** Flattened by the controller out of a `review_likes(count)` aggregate. */
  like_count: number;
  /** Null when the author row was removed; the review itself survives. */
  users: ReviewAuthor | null;
};

/* ------------------------------------------------------------- flights --- */

/**
 * A row of `flight_options`. Both timestamps are naive (`YYYY-MM-DDTHH:mm:ss`)
 * and read as local time at their own airport, the way a timetable is printed —
 * `lib/airports.ts` holds the UTC offsets needed to turn the pair into a
 * duration.
 */
export type FlightOption = {
  id: string;
  origin_city_id: number;
  destination_city_id: number;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  currency: string;
};

/** `GET /api/flights/:id` joins the two cities that the list only keys by id. */
export type FlightDetail = Omit<
  FlightOption,
  "origin_city_id" | "destination_city_id"
> & {
  origin: FlightCity | null;
  destination: FlightCity | null;
};

export type FlightCity = CityRef & { provinces: ProvinceRef | null };

/** One day of the price calendar. `price` is null when nothing flies that day. */
export type FlightCalendarDay = {
  date: string;
  price: number | null;
};

/* ------------------------------------------------------------ bookings --- */

/**
 * `failed` is what the API writes once an invoice lapses — either from
 * Xendit's EXPIRED callback or from the backend's own deadline sweep.
 */
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type FlightBookingItem = {
  id: string;
  flight_type: "outbound" | "return";
  price: number;
  flight_options: {
    id: string;
    airline: string;
    flight_number: string;
    departure_time: string;
    arrival_time: string;
    origin: { id: number; name: string } | null;
    destination: { id: number; name: string } | null;
  } | null;
};

/** The list endpoint returns only these columns, without the items. */
export type FlightBookingSummary = {
  id: string;
  booking_code: string;
  total_price: number;
  payment_status: PaymentStatus;
  /** Payment deadline. Read as UTC — Postgres returns it without a zone. */
  invoice_expires_at: string | null;
  created_at: string;
  paid_at: string | null;
};

export type FlightBooking = FlightBookingSummary & {
  payment_method: string | null;
  invoice_url: string | null;
  flight_booking_items: FlightBookingItem[];
};

/** What `POST /:id/pay` hands back — `invoice_url` is hosted by Xendit. */
export type PaymentIntent = {
  booking_id: string;
  booking_code: string;
  amount: number;
  invoice_url: string;
  expires_at: string;
  /** True when an unexpired invoice already existed and was handed back. */
  reused: boolean;
};
