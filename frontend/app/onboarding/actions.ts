"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError, updatePreferences, updateProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { createClient } from "@/lib/supabase/server";
import {
  NAME_MAX,
  NAME_MIN,
  ONBOARDED_COOKIE,
  ONBOARDED_COOKIE_MAX_AGE,
  normaliseTravelProfile,
  type OnboardingInput,
  type TravelProfile,
} from "@/lib/onboarding";

export type SaveResult = { ok: true } | { ok: false; message: string };

const EXPIRED: SaveResult = {
  ok: false,
  message: "Sesi Anda sudah berakhir. Silakan masuk lagi.",
};

/**
 * Menyimpan seluruh isi wizard sekaligus, di langkah terakhir: nama ke tabel
 * profil, minat ke `/api/preferences`, sisanya ke `user_metadata` — backend
 * belum punya kolom untuk gaya liburan, dan metadata sudah ikut ke setiap
 * perangkat tanpa perlu migrasi.
 */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<SaveResult> {
  const name = input.fullName.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return {
      ok: false,
      message: `Nama harus ${NAME_MIN}–${NAME_MAX} karakter.`,
    };
  }

  const token = await getAccessToken();
  if (!token) return EXPIRED;

  // PUT /api/preferences mengganti seluruh himpunan, bukan menambah, jadi
  // daftar penuh yang dikirim -- dan id ganda cukup dibuang di sini.
  const tagIds = [...new Set(input.tagIds.filter(Boolean))];

  try {
    // Nama lebih dulu: controller `updateMe` menyalin ulang `user_metadata`
    // saat menyinkronkan nama, jadi menulis metadata sebelum itu berisiko
    // tertimpa oleh salinan yang dibacanya.
    await updateProfile({ full_name: name }, { token });
    await updatePreferences(tagIds, { token });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? `Gagal menyimpan (${error.status}): ${error.message}`
          : "Gagal menyimpan data Anda. Coba lagi.",
    };
  }

  const marked = await markOnboarded(normaliseTravelProfile(input));
  if (!marked.ok) return marked;

  revalidateAfterOnboarding();
  return { ok: true };
}

/**
 * "Lewati untuk sekarang". Tidak menyentuh profil maupun minat — hanya
 * menandai bahwa wizard sudah ditawarkan, supaya proxy berhenti memantulkan.
 * Halaman `/akun/minat` tetap terbuka kapan saja untuk mengisinya nanti.
 */
export async function skipOnboarding(): Promise<SaveResult> {
  const token = await getAccessToken();
  if (!token) return EXPIRED;

  const marked = await markOnboarded(null);
  if (!marked.ok) return marked;

  revalidateAfterOnboarding();
  return { ok: true };
}

/**
 * Menulis penanda selesai ke dua tempat sekaligus: metadata akun (catatan
 * sebenarnya, ikut lintas perangkat) dan cookie (jalan pintas untuk sesi ini,
 * lihat catatan di `lib/onboarding.ts`). `refreshSession` mencetak ulang token
 * supaya klaimnya menyusul juga; kalau gagal, cookie sudah menutupinya.
 */
async function markOnboarded(travel: TravelProfile | null): Promise<SaveResult> {
  const supabase = await createClient();

  const data: Record<string, unknown> = { onboarded_at: new Date().toISOString() };
  if (travel) data.travel = travel;

  const { error } = await supabase.auth.updateUser({ data });
  if (error) {
    return { ok: false, message: `Gagal menyimpan preferensi: ${error.message}` };
  }

  await supabase.auth.refreshSession().catch(() => {
    // Token lama masih sah sampai kedaluwarsa; cookie di bawah yang menjaga
    // agar proxy tidak memantulkan kembali ke wizard.
  });

  const store = await cookies();
  store.set(ONBOARDED_COOKIE, "1", {
    path: "/",
    maxAge: ONBOARDED_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true };
}

/** Nama, minat, dan rekomendasi muncul di ketiga permukaan ini. */
function revalidateAfterOnboarding() {
  revalidatePath("/akun", "layout");
  revalidatePath("/akun/minat");
  revalidatePath("/");
}
