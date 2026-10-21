/** What a staff member's camera can read: a guest's invitation link, or just the token from it. */
const TOKEN = /^[A-Za-z0-9_-]{8,200}$/;

/**
 * The guest token in a scanned code. The pass is the invitation link,
 * `<site>/i/<token>`, so the token is the last path segment; a bare token is
 * accepted too (typed in, or a QR that carries only the token). Null for anything
 * else, such as a Wi-Fi code or a link to some other page. Whether the token
 * belongs to a guest of this event is for the database to say.
 */
export function extractToken(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    const last = url.pathname.split("/").filter(Boolean).at(-1);
    if (!last) return null;
    let segment = last;
    try {
      segment = decodeURIComponent(last);
    } catch {
      return null;
    }
    return TOKEN.test(segment) ? segment : null;
  }

  return TOKEN.test(trimmed) ? trimmed : null;
}
