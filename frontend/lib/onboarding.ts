/**
 * Personalisasi awal — dipakai bertiga: wizard di `/onboarding`, server action
 * yang menyimpannya, dan proxy yang memutuskan siapa yang masih harus melihat
 * halaman itu.
 *
 * Sengaja tanpa import apa pun supaya proxy (edge runtime) bisa memakai
 * konstantanya tanpa ikut menarik komponen UI.
 */

export const ONBOARDING_PATH = "/onboarding";

/**
 * Ditulis begitu wizard selesai atau dilewati.
 *
 * Catatan yang sebenarnya adalah `user_metadata.onboarded_at` — ia ikut ke
 * mana pun akun dipakai. Tetapi metadata yang baru ditulis belum masuk ke
 * access token sampai token dicetak ulang, jadi tanpa penanda kedua ini proxy
 * akan terus memantulkan orang yang sama kembali ke wizard sampai sesinya
 * berakhir. Cookie ini adalah jalan pintas untuk sesi tersebut.
 */
export const ONBOARDED_COOKIE = "jl_onboarded";

/** Setahun: cukup lama sampai token pasti sudah dicetak ulang berkali-kali. */
export const ONBOARDED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Rute yang tetap boleh dibuka walau personalisasi belum diisi. */
export const ONBOARDING_EXEMPT_PREFIXES = [
  ONBOARDING_PATH,
  "/auth",
  "/api",
  // Album dibagikan lewat tautan publik; pemiliknya tidak selalu yang membuka.
  "/album",
];

export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const CITY_MAX = 80;

/** Minimal tema liburan sebelum langkah minat boleh dilanjutkan. */
export const MIN_INTERESTS = 3;

/**
 * Satu-satunya pertanyaan gaya liburan yang tersisa. Cukup pendek untuk muat
 * sebagai deretan chip di bawah dua isian teks, jadi langkah pertama tetap
 * satu layar.
 */
export const TRAVEL_PARTIES = [
  { value: "solo", label: "Sendiri" },
  { value: "couple", label: "Berdua" },
  { value: "family", label: "Keluarga" },
  { value: "friends", label: "Rombongan teman" },
] as const;

export type TravelParty = (typeof TRAVEL_PARTIES)[number]["value"];

/** Disimpan di `user_metadata.travel`; backend tidak punya kolom untuk ini. */
export type TravelProfile = {
  home_city: string | null;
  party: TravelParty | null;
};

export const EMPTY_TRAVEL_PROFILE: TravelProfile = {
  home_city: null,
  party: null,
};

/** Apa yang dikirim wizard ke server action, sebelum divalidasi. */
export type OnboardingInput = {
  fullName: string;
  homeCity: string;
  party: string;
  tagIds: string[];
};

function pickParty(raw: string): TravelParty | null {
  return TRAVEL_PARTIES.some((option) => option.value === raw)
    ? (raw as TravelParty)
    : null;
}

/**
 * Menyaring kiriman wizard menjadi bentuk yang aman disimpan. Hanya nama yang
 * wajib — sisanya boleh kosong supaya "Lewati" tetap menghasilkan profil utuh.
 */
export function normaliseTravelProfile(input: OnboardingInput): TravelProfile {
  const city = input.homeCity.trim().slice(0, CITY_MAX);
  return {
    home_city: city || null,
    party: pickParty(input.party),
  };
}

/**
 * Membaca `user_metadata` apa adanya — isinya ditulis klien, jadi tidak ada
 * jaminan bentuknya masih sesuai versi ini.
 */
export function readTravelProfile(metadata: unknown): TravelProfile {
  const travel = (metadata as { travel?: unknown } | null)?.travel;
  if (!travel || typeof travel !== "object") return EMPTY_TRAVEL_PROFILE;
  const raw = travel as Record<string, unknown>;
  return {
    home_city:
      typeof raw.home_city === "string" && raw.home_city.trim()
        ? raw.home_city.trim().slice(0, CITY_MAX)
        : null,
    party: pickParty(String(raw.party ?? "")),
  };
}

/** Sudah pernah menyelesaikan (atau melewati) personalisasi. */
export function hasOnboarded(metadata: unknown): boolean {
  const value = (metadata as { onboarded_at?: unknown } | null)?.onboarded_at;
  return typeof value === "string" && value.length > 0;
}
