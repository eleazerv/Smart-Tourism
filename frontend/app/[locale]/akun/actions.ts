"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ApiError, updatePreferences, updateProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "@/lib/profile-name";

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * Replaces the user's whole preference set. `PUT /api/preferences` is a
 * replace, not an append, so the client sends the full selection every time.
 */
export async function savePreferences(tagIds: string[]): Promise<SaveResult> {
  const t = await getTranslations("reviewActions");
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, message: t("sessionExpired") };
  }

  try {
    await updatePreferences(tagIds, { token });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? t("saveFailed", { status: error.status, message: error.message })
          : t("interestsFailed"),
    };
  }

  // Both surfaces render for-you recommendations off this data.
  revalidatePath("/akun");
  revalidatePath("/akun/minat");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Renames the signed-in user. The API mirrors the new name into the auth
 * metadata too, which is what the header menu reads.
 */
export async function saveDisplayName(fullName: string): Promise<SaveResult> {
  const t = await getTranslations("reviewActions");
  const name = fullName.trim();
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: t("nameRange", {
        min: NAME_MIN_LENGTH,
        max: NAME_MAX_LENGTH,
      }),
    };
  }

  const token = await getAccessToken();
  if (!token) {
    return { ok: false, message: t("sessionExpired") };
  }

  try {
    await updateProfile({ full_name: name }, { token });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? t("saveFailed", { status: error.status, message: error.message })
          : t("nameFailed"),
    };
  }

  // The name shows up in the sidebar, the header menu, and on reviews.
  revalidatePath("/akun", "layout");
  revalidatePath("/");
  return { ok: true };
}
