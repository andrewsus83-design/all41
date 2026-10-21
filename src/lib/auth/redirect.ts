export const DEFAULT_AFTER_SIGN_IN = "/dashboard";

const AUTH_PATHS = ["/login", "/signup", "/auth"];

/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed, so a crafted `?next=` link cannot bounce people to another site,
 * and the auth pages themselves are skipped to avoid redirect loops.
 */
export function safeNextPath(next: string | null | undefined, fallback = DEFAULT_AFTER_SIGN_IN): string {
  if (typeof next !== "string" || next === "") return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;

  // Browsers read a backslash as a slash and drop tabs and newlines inside a
  // URL, so "/\evil.com" and "/\t/evil.com" both end up on another site.
  if (/[\\\p{Cc}]/u.test(next)) return fallback;

  const path = next.split(/[?#]/, 1)[0];
  if (AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`))) return fallback;

  return next;
}
