/**
 * Shared by the rename form and the server action. Kept out of
 * `app/akun/actions.ts` because a `"use server"` module may only export
 * async functions.
 */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;
