import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

/** Supabase Auth hashes with bcrypt, which ignores everything past 72 bytes. */
const MAX_PASSWORD_BYTES = 72;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES);

/**
 * Sign-in only checks that a password was sent. Accounts are shared with other
 * apps on the same Supabase project, so an older password may not meet the
 * rules we set for new ones.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});
