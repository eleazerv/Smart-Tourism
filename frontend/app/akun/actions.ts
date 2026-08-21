"use server";

import { revalidatePath } from "next/cache";
import { ApiError, updatePreferences } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * Replaces the user's whole preference set. `PUT /api/preferences` is a
 * replace, not an append, so the client sends the full selection every time.
 */
export async function savePreferences(tagIds: string[]): Promise<SaveResult> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, message: "Sesi Anda sudah berakhir. Silakan masuk lagi." };
  }

  try {
    await updatePreferences(tagIds, { token });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? `Gagal menyimpan (${error.status}): ${error.message}`
          : "Gagal menyimpan minat. Coba lagi.",
    };
  }

  // Both surfaces render for-you recommendations off this data.
  revalidatePath("/akun");
  revalidatePath("/akun/minat");
  revalidatePath("/");
  return { ok: true };
}
