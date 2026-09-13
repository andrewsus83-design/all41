/**
 * Honest, one-line packaging copy for the SEO/GEO recurring ADD-ONS (the LAUNCH SET —
 * docs/APP1_SEO_GEO_COMPLETE.md Part 5). These are pay-per-run scheduled services, NOT
 * subscriptions: turning one on just sets a schedule; each run deducts credits only when it
 * actually runs; the owner stops anytime and is never charged for a failed run.
 *
 * Static copy keyed by mini_apps.slug (the catalog itself lives in the DB). Nothing imports this
 * yet — surface `costLine` in the Build modal ("Turn on" confirmation) and on the My Apps card so
 * the true per-run cost + "pay only when it runs" is visible before someone turns a service on.
 * The dollar figures mirror each app's `est_credit_cost`; Advanced Research shows its hard ceiling.
 */
export type AddonPackaging = {
  /** Recommended cadence, in the founder's plain words — never "plan"/"retainer"/"subscription". */
  cadence: string;
  /** The one honest line about what turning this on costs. */
  costLine: string;
};

export const ADDON_PACKAGING: Record<string, AddonPackaging> = {
  "geo-monitor": {
    cadence: "runs weekly",
    costLine: "≈ $0.90 per weekly check — you only pay when it runs. Stop anytime; never charged for a failed run.",
  },
  "gap-finder": {
    cadence: "runs weekly or monthly",
    costLine: "≈ $1.50 per run — only when it runs. Stop anytime; nothing for a failed run.",
  },
  "rank-pulse": {
    cadence: "runs weekly",
    costLine: "≈ $0.20 per weekly check — the cheapest way to keep an eye on your rankings. Only when it runs; stop anytime.",
  },
  "site-health": {
    cadence: "runs weekly",
    costLine: "≈ $0.50 per weekly check — only when it runs. Stop anytime; never charged for a failed run.",
  },
  "advanced-research": {
    cadence: "run on demand (or monthly)",
    costLine: "Up to $1.50 per run (hard cap) — pay per run, only when it runs. Stop anytime; nothing for a failed run.",
  },
};

/** Convenience accessor — returns undefined for apps that aren't pay-per-run add-ons. */
export function addonPackaging(slug: string): AddonPackaging | undefined {
  return ADDON_PACKAGING[slug];
}
