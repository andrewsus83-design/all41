/**
 * Structured data (JSON-LD) for search engines + AI answer engines (GEO).
 * The data is our own, so JSON.stringify is safe; we still escape "<" to <
 * per the Next.js JSON-LD guide as defense-in-depth. Render inside a server component.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
