import type { OutputSchemaKey } from "@/lib/engine/schemas";

/** Static marketing metadata keyed by mini_apps.slug. The catalog itself comes from the DB. */
export type AppMeta = {
  replaces: string;
  /** one-line "who is this for" used in Solutions personas */
  pitch: string;
  sample: SampleOutput;
};

export type SampleOutput =
  | { schema: "briefing"; title: string; items: { headline: string; why_it_matters: string; action: string }[]; sources: { ref: string; quote: string }[] }
  | { schema: "report"; title: string; summary: string; table: { dimension: string; them: string; you: string }[]; threats: string[]; opportunities: string[]; next_move: string; sources: { ref: string; quote: string }[] }
  | { schema: "content_pack"; title: string; drafts: { platform: string; hook: string; body: string; cta: string }[]; sources: { ref: string; quote: string }[] };

export const APP_META: Record<string, AppMeta> = {
  "morning-briefing": {
    replaces: "Feedly / Mention ($8–41/mo)",
    pitch: "Know what changed in your niche before your first call.",
    sample: {
      schema: "briefing",
      title: "AI tools for agencies — Tuesday briefing",
      items: [
        { headline: "Two mid-market agencies announced flat-fee AI retainers this week", why_it_matters: "Pricing pressure is moving from hourly to outcome-based; your proposals still quote hours.", action: "Draft one outcome-priced offer for your next three pitches." },
        { headline: "Google Workspace added native meeting summaries to Business plans", why_it_matters: "Clients on Workspace will stop paying for standalone note tools.", action: "Remove Otter from the recommended stack in your onboarding doc." },
        { headline: "A popular scheduling tool raised prices by a third for teams", why_it_matters: "Two of your clients are on it; renewal is next month.", action: "Send both a short note with an alternative before renewal." },
      ],
      sources: [
        { ref: "R1", quote: "…moving to a flat monthly fee that includes AI-assisted production…" },
        { ref: "R3", quote: "…summaries now included in Business Standard and above…" },
      ],
    },
  },
  "competitor-crawler": {
    replaces: "SEMrush / Ahrefs ($99–129/mo)",
    pitch: "Know when a competitor moves — pricing, features, positioning.",
    sample: {
      schema: "report",
      title: "Jasper AI · pricing vs. your Pro plan",
      summary: "Jasper sells seats with word caps; you sell a flat plan with unlimited output. Their Creator tier undercuts you on sticker price, their Pro tier is above you once a second seat is added.",
      table: [
        { dimension: "Entry price", them: "$39/seat/mo (annual)", you: "$29/mo flat" },
        { dimension: "Output limits", them: "Word caps per tier", you: "Unlimited" },
        { dimension: "Brand voice", them: "Included from Pro", you: "Included" },
        { dimension: "Team seats", them: "Per seat", you: "Not yet" },
      ],
      threats: ["Their annual discount makes the entry tier look cheaper than yours", "Seat-based pricing scales revenue with teams; yours does not", "Brand voice is now table stakes"],
      opportunities: ["Lead with 'unlimited, no word caps' on the pricing page", "Introduce a 2-seat option before they discount further", "Publish a plain comparison table — they hide caps in the footnotes"],
      next_move: "Keep the $29 price; add a clearly-labelled 'no caps' line above the fold and test a 2-seat add-on.",
      sources: [
        { ref: "C1", quote: "Creator — $39 per month, billed annually…" },
        { ref: "S2", quote: "Pro plan: $29/month, unlimited generations (your pricing page)" },
      ],
    },
  },
  "content-pipeline": {
    replaces: "Jasper / Buffer ($49–99/mo)",
    pitch: "One idea, in your voice, native to each platform.",
    sample: {
      schema: "content_pack",
      title: "Why solo founders should track cost per task",
      drafts: [
        { platform: "LinkedIn", hook: "I paid for eight tools last year. I could name the cost of two.", body: "Subscriptions hide the price of work. Per-task pricing shows it. When every run has a number attached, you stop paying for the tools you open twice a month and start paying for the outcomes you actually ship.", cta: "What is the real cost of your last report? Reply and I will compare." },
        { platform: "X", hook: "Subscriptions hide the price of work.", body: "Per-task pricing shows it. Eight tools, two I could price. Now every run has a number.", cta: "Track cost per task, not per month." },
        { platform: "Newsletter", hook: "The two-tools rule", body: "A short story about the month I cancelled six subscriptions and what replaced them — plus the one metric that made the decision obvious.", cta: "Read the breakdown →" },
      ],
      sources: [{ ref: "S1", quote: "…from your note 'stack audit, August': six tools opened fewer than three times…" }],
    },
  },
};

/** Plain-words description of each output schema (from src/lib/engine/schemas.ts). */
export const SCHEMA_WORDS: Record<OutputSchemaKey, string> = {
  briefing: "up to 5 headlines, each with why it matters and one action, sources cited",
  report: "a summary, a side-by-side table, 3 threats, 3 opportunities, a next move, sources cited",
  content_pack: "one native draft per platform with a hook, body and CTA, sources cited",
  answer: "a direct answer, key points, a next action, sources cited",
  verification: "a verdict with conflicts and unsupported claims listed",
  seo_report: "two health scores, top-5 quick wins, technical/keyword/competitor/GEO/social findings, sources cited",
  proposal_report: "a compliance matrix, an executive summary, consultant-grade sections, win themes, flags and sources",
  clip_report: "ready-to-post vertical clips, each with a virality score, hook type, caption and why it was chosen — plus the moments that were dropped",
  website_report: "a live, conversion-optimized website — pages with a benefit-led headline, value prop, proof and one CTA, the style, an SEO/GEO baseline, and what to check",
  content_report: "a week of content from one idea — a core piece plus channel-native repurposes with hook options, a posting schedule, and sources",
  competitor_report: "what changed per competitor (noise filtered) with why it matters, intel on what it signals, dynamic battlecards, trends over time, and sources",
  social_report: "a social-media performance report: hero metrics, top and bottom posts with why/how-to-fix, performance by content type, best posting times, follower growth, cross-platform comparison, and prioritized recommendations",
};

/** Roadmap apps from Master Plan §11 — not available yet. */
export type RoadmapApp = { slug: string; name: string; icon: string; description: string; replaces: string; costLine: string };
export const ROADMAP_APPS: RoadmapApp[] = [
  { slug: "email-campaign", name: "Email Campaign", icon: "✉️", description: "Write, segment and schedule a campaign from one brief.", replaces: "Mailchimp / ConvertKit ($13–39/mo)", costLine: "~$0.02 per campaign" },
  { slug: "crm-lite", name: "CRM Lite", icon: "🗂️", description: "Enrich contacts and keep a simple pipeline without a CRM subscription.", replaces: "HubSpot / Salesforce ($15–800/mo)", costLine: "~$0.01 per enrich" },
  { slug: "invoice-tracker", name: "Invoice Tracker", icon: "🧾", description: "Scan invoices, extract the numbers, flag what is overdue.", replaces: "FreshBooks / QuickBooks ($17–30/mo)", costLine: "~$0.01 per scan" },
  { slug: "social-monitor", name: "Social Monitor", icon: "📡", description: "Watch mentions of your brand and competitors across platforms.", replaces: "Brand24 / Mention ($41–79/mo)", costLine: "~$0.01 per day" },
  { slug: "meeting-notes", name: "Meeting Notes", icon: "🎙️", description: "Turn a recording into decisions, owners and follow-ups.", replaces: "Otter / Fireflies ($16–19/mo)", costLine: "~$0.02 per meeting" },
];

/** Persona → first briefing + the two apps they would add. Used on /solutions. */
export type Persona = { id: string; name: string; briefing: { what: string; goal: string }; apps: string[] };
export const PERSONAS: Persona[] = [
  { id: "founder", name: "Founder", briefing: { what: "Compare Jasper AI's pricing tiers to our $29 plan", goal: "Decide whether to cut our Pro price before Q4" }, apps: ["competitor-crawler", "morning-briefing"] },
  { id: "consultant", name: "Consultant", briefing: { what: "Summarize what changed in Indonesian fintech regulation this month", goal: "Open Monday's client call with three things they missed" }, apps: ["morning-briefing", "content-pipeline"] },
  { id: "agency", name: "Agency owner", briefing: { what: "Turn our case study on the retail client into a LinkedIn post and a newsletter section", goal: "Book two discovery calls this month" }, apps: ["content-pipeline", "competitor-crawler"] },
  { id: "freelancer", name: "Freelancer", briefing: { what: "Draft three contrarian posts about pricing per task instead of per month", goal: "Grow the newsletter without paying for a writing tool" }, apps: ["content-pipeline", "morning-briefing"] },
];
