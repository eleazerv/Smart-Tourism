import { supabase } from "../lib/supabase.js";

import { randomUUID } from 'node:crypto';
import { ALLOWED_MIME } from "../middleware/HandleReviewPhoto.js";
const REVIEW_FIELDS = `
    id,
    destination_id,
    rating,
    comment,
    photo_url,
    created_at,
    users(id, full_name, avatar_url),
    review_likes(count)
`;
const BUCKET = 'review-photos'; // bucket Supabase Storage untuk foto review

const shapeReview = (row) => ({
    ...row,
    review_likes: undefined,
    like_count: row.review_likes?.[0]?.count ?? 0
});

export async function deletePhotoFromStorage(db, path) {
  if (!path) return;
  try {
    await db.storage.from(BUCKET).remove([path]);
  } catch (cleanupErr) {
    console.error(`[deletePhotoFromStorage] deleted photo but failed to cleanup`, path, cleanupErr);
  }
}

function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);

  if (idx === -1) return null;

  return publicUrl.substring(idx + marker.length);
}


// GET /api/destinations/:id/reviews
export const getReviews = async (req, res) => {
    try {
        const destinationId = req.params.id;
        const { sort = 'recent' } = req.query;

        if (!['recent', 'likes'].includes(sort)) {
            return res.status(400).json({
                error: 'invalid_sort',
                message: 'sort must be recent or likes'
            });
        }

        const { data, error } = await supabase
            .from('reviews')
            .select(REVIEW_FIELDS)
            .eq('destination_id', destinationId)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        const reviews = data.map(shapeReview);

        if (sort === 'likes') {
            reviews.sort((a, b) => b.like_count - a.like_count);
        }

        return res.json({ data: reviews });
    } catch (err) {
        console.error('[getReviews] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};

// POST /api/destinations/:id/reviews
export const createReview = async (req, res) => {
    let uploadedPath = null ; 
    try {
        const { rating , comment} = req.body ; 
        const destination_id = req.params.id;
        if (!destination_id) { 
            return res.status(400).json({
                error : 'invalid body',
                message: 'destination_id is required'
            })
        }

        const ratingNum = parseInt(rating); 
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                error: 'invalid_rating',
                message: 'rating must be an integer between 1 and 5'
            });
        }
        const {data: destination , error: destError} = await req.db
                                                            .from('destinations')
                                                            .select('id')
                                                            .eq('id', destination_id)
                                                            .maybeSingle();
                
        if (destError) throw destError;
        if (!destination) { 
            return res.status(404).json({
                error: 'not_found',
                message: 'Destination not found'
            })
        }

        let photoUrl = null  

        if (req.file) {
            if (!ALLOWED_MIME.includes(req.file.mimetype)) {
                return res.status(400).json({
                error: 'invalid_file_type',
                message:  'File type must be JPG, PNG, or WEBP',
                });
            }
            const ext = req.file.originalname.split('.').pop().toLowerCase(); 
            const path = `${req.user.id}/${Date.now()}-${randomUUID()}.${ext}`;       
            const { error : uploadError} = await req.db.storage 
                                                      .from(BUCKET) 
                                                      .upload(path,req.file.buffer, { 
                                                        contentType: req.file.mimetype,
                                                        upsert: false,
                                                      });
            if (uploadError) throw uploadError ; 
            uploadedPath = path
            const { data :urlData} = req.db.storage.from(BUCKET).getPublicUrl(path); 
            photoUrl = urlData.publicUrl ; 
        }

            const { data : review , error : insertError} = await req.db.from('reviews')
                                                                         .insert({
                                                                            destination_id,
                                                                            user_id: req.user.id,
                                                                            rating: ratingNum,
                                                                            comment: comment || null,
                                                                            photo_url: photoUrl
                                                                         })
                                                                         .select(REVIEW_FIELDS)
                                                                         .single(); 
            if (insertError) { 
                if (insertError.code === '23505') {
                    await deletePhotoFromStorage(req.db,uploadedPath)
                    return res.status(409).json({
                        error: 'already_reviewed',
                        message: 'You have already reviewed this destination'
                    })
                }
                throw insertError; 
            }
            return res.status(201).json({data : shapeReview(review)})
    } catch (err) {
        await deletePhotoFromStorage(req.db,uploadedPath);
    
        console.error('[createReview] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};



// DELETE /api/reviews/:id
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
 
    const { data, error } = await req.db
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', req.user.id)
      .select('id, photo_url')
      .maybeSingle();
 
    if (error) throw error;
 
    if (!data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Review not found',
      });
    }
    const path =  extractStoragePath(data.photo_url) 
    if (path) { 
        await deletePhotoFromStorage(req.db,path)
    }
 
    return res.json({ deleted: true, id: data.id });
  } catch (err) {
    console.error('[deleteReview] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

// POST /api/reviews/:id/like
export const likeReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.user.id;
        const { data: existing, error : existingError} = await req.db
        .from('review_likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', userId)
        .maybeSingle();

        if (existingError) throw existingError;
        
        if (existing) {
        const { delError } = await req.db.from('review_likes').delete().eq('id', existing.id);
        if (delError) throw delError;
        return res.json({ liked: false });
        }

        const { error } = await req.db
            .from('review_likes')
            .insert({ review_id: reviewId, user_id: req.user.id });

        if (error) {
            if (error.code === '23505') {
                return res.json({ liked: true, already: true });
            }
            throw error;
        }

        return res.status(201).json({ liked: true });
    } catch (err) {
        console.error('[likeReview] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};


// Batas jumlah id per permintaan. Katalog mengirim satu halaman (15 kartu)
// sekaligus, jadi ini cuma pagar supaya query-nya tidak bisa dibikin liar.
const MAX_COUNT_IDS = 60;

// GET /api/destinations/review-counts?ids=a,b,c
//
// Kartu daftar butuh "(1.234)" di sebelah bintangnya, sementara RPC
// search_destinations cuma mengembalikan avg_rating. Memanggil
// /:id/reviews per kartu berarti 15 request sekali render, jadi hitungannya
// dikumpulkan di sini dalam satu query.
export const getReviewCounts = async (req, res) => {
    try {
        const ids = String(req.query.ids ?? '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

        if (ids.length === 0) {
            return res.status(400).json({
                error: 'missing_ids',
                message: 'ids must be a comma-separated list of destination ids'
            });
        }

        if (ids.length > MAX_COUNT_IDS) {
            return res.status(400).json({
                error: 'too_many_ids',
                message: `ids must not exceed ${MAX_COUNT_IDS} entries`
            });
        }

        // Supabase tidak mengekspos GROUP BY, jadi kolom kuncinya ditarik apa
        // adanya lalu dihitung di sini — satu baris per ulasan, dibatasi ke
        // destinasi yang sedang tampil.
        const { data, error } = await supabase
            .from('reviews')
            .select('destination_id')
            .in('destination_id', ids);

        if (error) throw error;

        // Destinasi tanpa ulasan tetap dijawab 0, supaya client bisa
        // membedakan "belum ada ulasan" dari "belum sempat dihitung".
        const counts = Object.fromEntries(ids.map(id => [id, 0]));
        for (const row of data) {
            counts[row.destination_id] = (counts[row.destination_id] ?? 0) + 1;
        }

        return res.json({ data: counts });
    } catch (err) {
        console.error('[getReviewCounts] error', err);
        return res.status(500).json({ error: 'server_error' });
    }
};
