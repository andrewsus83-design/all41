/** Slugs that have a generated cover image at /app-covers/<slug>.png. */
export const COVER_SLUGS = new Set<string>([
  "advanced-research",
  "bid-no-bid",
  "blog-post-writer",
  "cold-email-writer",
  "competitive-intel",
  "content-pipeline",
  "deep-research",
  "email-campaign",
  "gap-finder",
  "geo-monitor",
  "invoice-tracker",
  "market-snapshot",
  "meeting-notes",
  "past-performance-library",
  "proposal-review",
  "proposal-rfp-maker",
  "rank-pulse",
  "seo-geo-optimizer",
  "site-health",
  "social-monitor"
]);

/** Cover image path for a slug, or null if none was generated. */
export function coverFor(slug: string): string | null {
  return COVER_SLUGS.has(slug) ? `/app-covers/${slug}.png` : null;
}
