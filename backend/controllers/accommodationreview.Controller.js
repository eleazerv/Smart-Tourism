import { supabase } from "../lib/supabase.js";
import { randomUUID } from 'node:crypto';
import { ALLOWED_MIME } from "../middleware/HandleReviewPhoto.js";
import { deletePhotoFromStorage } from "./reviews.Controller.js";

const REVIEW_FIELDS = `
id,
accommodation_id,
rating,
comment,
photo_url,
created_at,
users(id, full_name, avatar_url)
`;

function extractStoragePath(publicUrl) {
    if (!publicUrl) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
}
const BUCKET = 'accommodation-review-photos'; // bucket Supabase Storage terpisah dari review destinasi

// GET /api/accommodations/:id/reviews
export const getAccommodationReviews = async (req, res) => {
    try {
        const accommodationId = req.params.id;
        const { sort = 'recent' } = req.query;

        if (!['recent', 'rating'].includes(sort)) {
            return res.status(400).json({
                error: 'invalid_sort',
                message: 'sort must be recent or rating'
            });
        }

        let query = supabase
            .from('accommodation_reviews')
            .select(REVIEW_FIELDS)
            .eq('accommodation_id', accommodationId)
            .limit(500);

        if (sort === 'rating') {
            query = query.order('rating', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.json({ data });
    } catch (err) {
        console.error('[getAccommodationReviews] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};

// POST /api/accommodations/:id/reviews
// multipart/form-data: rating, comment, photo (opsional)
export const createAccommodationReview = async (req, res) => {
    let uploadedPath = null;
    try {
        const { rating, comment } = req.body;
        const accommodation_id = req.params.id;

        if (!accommodation_id) {
            return res.status(400).json({
                error: 'invalid body',
                message: 'accommodation_id is required'
            });
        }

        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                error: 'invalid_rating',
                message: 'rating must be an integer between 1 and 5'
            });
        }

        const { data: accommodation, error: accError } = await req.db
            .from('accommodations')
            .select('id')
            .eq('id', accommodation_id)
            .maybeSingle();

        if (accError) throw accError;
        if (!accommodation) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Accommodation not found'
            });
        }

        let photoUrl = null;

        if (req.file) {
            if (!ALLOWED_MIME.includes(req.file.mimetype)) {
                return res.status(400).json({
                    error: 'invalid_file_type',
                    message: 'File type must be JPG, PNG, or WEBP',
                });
            }
            const ext = req.file.originalname.split('.').pop().toLowerCase();
            const path = `${req.user.id}/${Date.now()}-${randomUUID()}.${ext}`;
            const { error: uploadError } = await req.db.storage
                .from(BUCKET)
                .upload(path, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });
            if (uploadError) throw uploadError;
            uploadedPath = path;
            const { data: urlData } = req.db.storage.from(BUCKET).getPublicUrl(path);
            photoUrl = urlData.publicUrl;
        }

        const { data: review, error: insertError } = await req.db
            .from('accommodation_reviews')
            .insert({
                accommodation_id,
                user_id: req.user.id,
                rating: ratingNum,
                comment: comment || null,
                photo_url: photoUrl,
            })
            .select(REVIEW_FIELDS)
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                await deletePhotoFromStorage(req.db, uploadedPath);
                return res.status(409).json({
                    error: 'already_reviewed',
                    message: 'You have already reviewed this accommodation'
                });
            }
            throw insertError;
        }

        return res.status(201).json({ data: review });
    } catch (err) {
        await deletePhotoFromStorage(req.db, uploadedPath);

        console.error('[createAccommodationReview] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};

// DELETE /api/accommodation-reviews/:id
export const deleteAccommodationReview = async (req, res) => {
    try {
        const reviewId = req.params.id;

        const { data, error } = await req.db
            .from('accommodation_reviews')
            .delete()
            .eq('id', reviewId)
            .eq('user_id', req.user.id)
            .select('id, photo_url')
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Review not found or not yours',
            });
        }

        const path = extractStoragePath(data.photo_url);
        if (path) {
            await deletePhotoFromStorage(req.db, path);
        }

        return res.json({ deleted: true, id: data.id });
    } catch (err) {
        console.error('[deleteAccommodationReview] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
