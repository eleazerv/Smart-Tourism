/**
 * Reserved slug for the saves that belong to no album.
 *
 * Album ids are UUIDs, so this can never collide with a real one — which is
 * what lets `/akun/tersimpan/[id]` serve both without a second route.
 */
export const LOOSE_SLUG = "tanpa-album";
