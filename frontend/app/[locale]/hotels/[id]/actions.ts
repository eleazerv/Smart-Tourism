"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  ApiError,
  createAccommodationReview,
  deleteAccommodationReview,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

export type ReviewResult = { ok: boolean; message?: string };



/** The API rejects anything larger before it reaches Storage. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type Copy = Awaited<ReturnType<typeof getTranslations<"reviewActions">>>;

function explain(
  error: unknown,
  fallback: string,
  t: Copy,
): ReviewResult {
  if (!(error instanceof ApiError)) return { ok: false, message: fallback };

  // The few statuses worth translating; everything else keeps the API's text.
  if (error.status === 409) {
    return { ok: false, message: t("alreadyReviewedStay") };
  }
  if (error.status === 401 || error.status === 403) {
    return { ok: false, message: t("sessionExpired") };
  }
  return { ok: false, message: error.message };
}

export async function submitStayReview(
  accommodationId: string,
  formData: FormData,
): Promise<ReviewResult> {
  const t = await getTranslations("reviewActions");
  const token = await getAccessToken();
  if (!token) return { ok: false, message: t("sessionExpired") };

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Penilaian harus antara 1 sampai 5 bintang." };
  }

  const comment =
    (formData.get("comment") as string | null)?.trim() || undefined;

  // An empty file input still arrives as a zero-byte File, which multer would
  // happily forward to Storage.
  const file = formData.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : undefined;
  if (photo && photo.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Ukuran foto maksimal 5 MB." };
  }

  try {
    await createAccommodationReview(
      accommodationId,
      { rating, comment, photo },
      { token },
    );
  } catch (error) {
    return explain(error, t("submitFailed"), t);
  }

  revalidatePath(`/hotels/${accommodationId}`);
  return { ok: true, message: "Terima kasih, ulasan Anda sudah tayang." };
}

export async function removeStayReview(
  accommodationId: string,
  reviewId: string,
): Promise<ReviewResult> {
  const t = await getTranslations("reviewActions");
  const token = await getAccessToken();
  if (!token) return { ok: false, message: t("sessionExpired") };

  try {
    await deleteAccommodationReview(reviewId, { token });
  } catch (error) {
    return explain(error, t("deleteFailed"), t);
  }

  revalidatePath(`/hotels/${accommodationId}`);
  return { ok: true };
}
