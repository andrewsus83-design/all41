/** Keeps only characters that belong in a name, email or phone, so a search cannot alter the filter. */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").replace(/\s+/g, " ").trim().slice(0, 100);
}
