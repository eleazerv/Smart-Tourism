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

/**
 * One row of `GET /api/saved-destinations` — the destination columns the
 * controller selects, flattened out of the join, plus when it was saved.
 */
export type SavedDestination = Pick<
  Destination,
  "id" | "name" | "category" | "cover_image_url" | "avg_rating" | "view_count"
> & {
  provinces: ProvinceRef | null;
  cities: CityRef | null;
  saved_id: string;
  saved_at: string;
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

/* ------------------------------------------------- AI trip planner --- */

/** Kelas penginapan di katalog. */
export type AccommodationTier = "budget" | "mid" | "luxury";

/** Kota yang punya penerbangan di katalog, untuk dropdown rute. */
export type City = {
  id: number;
  name: string;
  is_major_hub: boolean;
  provinces: ProvinceRef | null;
};

/**
 * Penginapan di sekitar sebuah destinasi. `distance_km` dihitung backend dari
 * koordinat destinasinya, dan hasilnya sudah terurut dari yang terdekat.
 */
/** Room counts from `GET /api/accommodations/:id/availability`. */
export type AccommodationAvailability = {
  booked: number;
  available: number;
  room_count: number;
};

/**
 * One row of `GET /api/accommodations/:id/reviews`. Unlike destination
 * reviews these carry no like aggregate — there is no `accommodation_review_likes`
 * table behind them.
 */
export type AccommodationReview = {
  id: string;
  accommodation_id: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  users: ReviewAuthor | null;
};

/**
 * Shape from `GET /api/accommodations` — the standalone catalogue behind
 * `/hotels`. Wider than `NearbyAccommodation`: the list controller also joins
 * the city (with its province) and selects the review aggregates.
 */
export type Accommodation = {
  id: string;
  name: string;
  tier: AccommodationTier;
  price_per_night: number;
  max_guests: number | null;
  partner_name: string | null;
  external_url: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  /** 0 across the whole seeded table today — no accommodation is reviewed yet. */
  avg_rating: number | null;
  review_count: number;
  cities: (CityRef & { provinces: ProvinceRef | null }) | null;
};

export type NearbyAccommodation = {
  id: string;
  name: string;
  tier: AccommodationTier;
  price_per_night: number;
  max_guests: number | null;
  partner_name: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Null kalau salah satu titiknya tidak punya koordinat. */
  distance_km: number | null;
};


/**
 * Kartu pilihan yang menempel di bawah satu balasan AI.
 *
 * Backend hanya menyertakan opsi yang benar-benar disebut model di teks
 * jawabannya (`buildInteractiveBlocks` di `Chat.Controller.js`), jadi isi kartu
 * dan isi kalimat tidak pernah berbeda. Semua tetap sekadar tawaran: yang
 * memindahkannya ke rencana adalah klik pengguna, bukan AI.
 */
export type DestinationOption = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  category: string | null;
  /** 0 atau null berarti belum pernah direview, bukan dinilai jelek. */
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  /** Satu kalimat kenapa tempat ini cocok, dari katalog. */
  note?: string | null;
  /** Ditempelkan backend sesudah model menjawab, jadi bisa null. */
  cover_image_url?: string | null;
};

export type AccommodationOption = {
  id: string;
  name: string;
  tier: AccommodationTier;
  price_per_night: number;
  max_guests: number | null;
  /** Jarak ke destinasi yang ditanyakan, sudah dihitung backend. */
  distance_km: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type PlannerFlightOption = {
  id: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
};

export type InteractiveBlock =
  | { type: "destination"; options: DestinationOption[] }
  | {
      type: "accommodation";
      /** Destinasi yang penginapan ini menempel padanya. */
      destination_id: string;
      near: string;
      options: AccommodationOption[];
    }
  | {
      type: "flight";
      date: string;
      origin_city_id: number;
      destination_city_id: number;
      options: PlannerFlightOption[];
    };

export type ChatRoom = {
  id: string;
  title: string;
  trip_id: string;
  created_at: string;
  updated_at?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  tool_name: string | null;
  /** Tidak ada saat model menjawab tanpa menawarkan apa pun. */
  interactive?: InteractiveBlock[];
  /** Nama tool katalog yang dipakai. Array kosong = jawaban tanpa data. */
  tools_used?: string[];
};

export type TripItemStatus = "suggested" | "confirmed" | "booked" | "removed";

export type TripItem = {
  id: string;
  sequence_order: number;
  status: TripItemStatus;
  notes: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number;
  /** `ai` untuk yang datang dari saran, `user` untuk yang dipilih sendiri. */
  added_by: "user" | "ai";
  destinations: {
    id: string;
    name: string;
    category: string | null;
    latitude: number | null;
    longitude: number | null;
    cities: { id: number; name: string } | null;
  } | null;
  accommodations: {
    id: string;
    name: string;
    tier: AccommodationTier;
    price_per_night: number;
    max_guests: number | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export type TripFlight = {
  id: string;
  flight_type: "outbound" | "return";
  /** Terisi begitu penerbangannya benar-benar dipesan; sesudah itu terkunci. */
  booked_at: string | null;
  flight_options: {
    id: string;
    airline: string;
    flight_number: string;
    departure_time: string;
    arrival_time: string;
    price: number;
  } | null;
};

export type TripSummary = {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  travelers: number;
  status: string;
  origin_city_id: number | null;
  cities: { name: string } | null;
};

/** Bentuk rencana yang dikembalikan setiap endpoint `/api/trips/...`. */
export type TripCanvas = {
  trip: TripSummary | null;
  items: TripItem[];
  flights: TripFlight[];
};

export type ChatTurn = {
  answer: string;
  canvas: TripCanvas;
  tools_used: string[];
  interactive: InteractiveBlock[];
};

/**
 * Checkout tidak all-or-nothing: kamar yang keburu penuh tidak membatalkan
 * tiket yang sudah dapat, jadi kegagalan datang per baris di `errors`.
 */
export type CheckoutResult = {
  flight_booking: { id: string; booking_code: string } | null;
  accommodation_bookings: {
    destination: string;
    booking_code: string;
    id?: string;
  }[];
  errors: { kind: string; message: string }[];
};
