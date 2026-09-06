"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  createAccommodationReview,
  deleteAccommodationReview,
} from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

export type ReviewResult = { ok: boolean; message?: string };

const SIGNED_OUT: ReviewResult = {
  ok: false,
  message: "Sesi Anda sudah berakhir. Silakan masuk lagi.",
};

/** The API rejects anything larger before it reaches Storage. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function explain(error: unknown, fallback: string): ReviewResult {
  if (!(error instanceof ApiError)) return { ok: false, message: fallback };

  // The few statuses worth translating; everything else keeps the API's text.
  if (error.status === 409) {
    return { ok: false, message: "Anda sudah pernah mengulas penginapan ini." };
  }
  if (error.status === 401 || error.status === 403) return SIGNED_OUT;
  return { ok: false, message: error.message };
}

export async function submitStayReview(
  accommodationId: string,
  formData: FormData,
): Promise<ReviewResult> {
  const token = await getAccessToken();
  if (!token) return SIGNED_OUT;

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
    return explain(error, "Gagal mengirim ulasan. Coba lagi.");
  }

  revalidatePath(`/hotels/${accommodationId}`);
  return { ok: true, message: "Terima kasih, ulasan Anda sudah tayang." };
}

export async function removeStayReview(
  accommodationId: string,
  reviewId: string,
): Promise<ReviewResult> {
  const token = await getAccessToken();
  if (!token) return SIGNED_OUT;

  try {
    await deleteAccommodationReview(reviewId, { token });
  } catch (error) {
    return explain(error, "Gagal menghapus ulasan. Coba lagi.");
  }

  revalidatePath(`/hotels/${accommodationId}`);
  return { ok: true };
}
