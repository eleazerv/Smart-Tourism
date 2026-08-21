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

export type SeasonalRecommendations = {
  month: number;
  season_summary: string[];
  province_id: number | null;
  destinations: Destination[];
};

export type PersonalRecommendations = {
  preference_tags: Tag[];
  destinations: (Destination & {
    match_score: number;
    matched_tags: string[];
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

export type Review = {
  id: string;
  destination_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  like_count: number;
};
