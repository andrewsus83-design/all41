import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400";

/** Public marketing routes crawlers may index (app + api routes stay disallowed for everyone). */
const ALLOW = ["/", "/solutions", "/apps", "/pricing", "/faq", "/benchmark", "/resources", "/privacy", "/terms"];
const DISALLOW = ["/api/", "/build", "/my-apps", "/models", "/settings", "/admin", "/onboarding", "/preview"];

/**
 * Explicitly welcome the AI answer engines + their crawlers (Master §9 — getting cited by AI
 * is a core GEO goal). Each gets the same public allow-list; app routes stay disallowed.
 */
const AI_BOTS = ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Bingbot", "Applebot-Extended"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
