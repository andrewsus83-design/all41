import { z } from "zod";

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/**
 * Addresses we keep for ourselves. The database refuses the same list in a
 * check constraint on a41_events.slug; a test keeps the two equal.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "www", "app", "api", "admin", "auth", "login", "signup", "dashboard", "mail", "email",
  "smtp", "support", "help", "status", "billing", "pay", "static", "assets", "cdn", "docs",
  "blog", "info", "staging", "preview",
];

/** "Annual Dinner 2026!" becomes "annual-dinner-2026", the start of a free address. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN, `Use at least ${SLUG_MIN} characters.`)
  .max(SLUG_MAX, `Use at most ${SLUG_MAX} characters.`)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use only letters, numbers and single hyphens.")
  .refine((slug) => !RESERVED_SLUGS.includes(slug), "That address is reserved. Pick another.");
