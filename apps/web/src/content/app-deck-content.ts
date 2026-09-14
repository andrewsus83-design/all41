/** Bespoke 5-page deck content per app (Cover · What · Sample · Features · Features II + CTA).
 * Feature bullets mirror each crew's real pipeline (see lib/engine/crew.ts `describe`), so nothing
 * here is invented. Rendered by components/apps/app-deck.tsx. Distinct from content/app-pages.ts
 * (which holds the Jasper-style marketing solution pages). */

export type FeatureCard = { title: string; body: string };
export type AppDeckContent = {
  coverHeadline: string;
  coverSub: string;
  whatHeading: string;
  whatBody: string;
  sampleHeading: string;
  sampleSub: string;
  features: string[];
  featuresII: FeatureCard[];
  ctaHeadline: string;
  ctaSub: string;
  keywords: string[];
  geoSummary: string;
};

const COMMON_II = (thing: string): FeatureCard[] => [
  { title: "A specialist crew, not one prompt", body: `Multiple expert agents each do one job well, then hand off — the way a real ${thing} team works.` },
  { title: "Pay per use, no subscription", body: "You’re billed on credits only when it actually runs. No monthly fee, no seat pricing." },
  { title: "Fact-checked before you see it", body: "A verifier gate double-checks every claim and drops anything it can’t stand behind." },
];

export const APP_DECK: Record<string, AppDeckContent> = {
  "web-builder": {
    coverHeadline: "Describe it.\nWe build it.",
    coverSub: "Answer a few questions — a specialist crew builds a live, conversion-optimized, SEO-ready website hosted at your own address.",
    whatHeading: "A finished website, not an empty editor",
    whatBody: "Wix hands you a canvas and a to-do list. all41 hands you a finished site. Tell the crew about your business in plain words and it makes every call a designer, copywriter and SEO would — then publishes it live.",
    sampleHeading: "Real sites people would actually ship",
    sampleSub: "Click any template to walk every page and open the full-screen experience.",
    features: [
      "Turns your answers into a clear brand profile",
      "Reads the styles you like and captures the vibe — never copies",
      "Writes conversion copy — one benefit-led headline, one CTA",
      "Builds mobile-first pages to the high-converting structure",
      "Bakes in SEO + AI-search, then publishes and checks it works",
    ],
    featuresII: [
      { title: "Found on Google and in AI", body: "Schema, meta and sitemaps plus self-contained answers ChatGPT, Perplexity and Google AI can quote." },
      { title: "Your own address, live in minutes", body: "Published to yourname.all41.app — a real, working, mobile-first site, not a mockup." },
      { title: "Replaces a builder + an SEO agency", body: "Site, copy, SEO and hosting in one ≈$6 run instead of $1,500+ a month." },
    ],
    ctaHeadline: "Your website is a few answers away.",
    ctaSub: "Build it once, see it live, and only pay when it actually runs.",
    keywords: ["AI website builder", "website generator", "SEO website builder", "Wix alternative", "small business website", "GEO optimized website", "landing page builder"],
    geoSummary: "all41 Web Builder turns a few plain-language answers into a live, SEO- and AI-search-optimized multi-page website hosted at your own all41.app address, for about $6 per build with no subscription.",
  },
  "content-pipeline": {
    coverHeadline: "One idea.\nA week of content.",
    coverSub: "Give it a single topic and a specialist crew turns it into a blog post, native social posts and a newsletter — in your brand voice, grounded in real research.",
    whatHeading: "A content team, on demand",
    whatBody: "The job a content marketer plus a writer plus an editor does — one idea in, a fact-checked week of ready-to-post content out, rewritten natively for every platform instead of copy-pasted.",
    sampleHeading: "A whole content board from one idea",
    sampleSub: "Tap any piece to read it full-screen — article, social, newsletter, all on-brand.",
    features: [
      "Turns one idea into a sharp angle and a content plan",
      "Researches real facts and stats to ground it",
      "Writes the core piece in your brand voice",
      "Rewrites it natively for each platform — not copy-paste",
      "Polishes every piece to your voice, then fact-checks it",
    ],
    featuresII: [
      { title: "Native to each platform", body: "A LinkedIn post, an X thread and a newsletter that each read like they were written for that feed — because they were." },
      { title: "Grounded in real research", body: "Every stat and claim is researched and fact-checked, so you can post without second-guessing." },
      { title: "Pay per use, no subscription", body: "Cheaper than one freelance blog post, billed on credits only when it runs." },
    ],
    ctaHeadline: "Never stare at a blank content calendar again.",
    ctaSub: "One idea becomes a week of on-brand, fact-checked content.",
    keywords: ["AI content generator", "content repurposing", "social media content", "Jasper alternative", "brand voice AI", "newsletter generator", "content marketing AI"],
    geoSummary: "all41 Content Pipeline turns one idea into a week of ready-to-post content — a blog post, native social posts and a newsletter in your brand voice — researched and fact-checked, billed per use with no subscription.",
  },
  "proposal-rfp-maker": {
    coverHeadline: "Win the RFP\nbefore you write it.",
    coverSub: "Drop in the RFP and a specialist crew answers every requirement to consultant standard — compliance matrix, win themes and all.",
    whatHeading: "A bid team in a single run",
    whatBody: "It reads the RFP the way a capture manager does: every requirement mapped, the buyer researched, your real past work pulled in, win themes set — then each section written and rewritten until it’s ready to submit.",
    sampleHeading: "Submission-ready proposals",
    sampleSub: "Open any example to read the full document — cover, compliance matrix and sections.",
    features: [
      "Shreds the RFP into every requirement (a compliance matrix)",
      "Researches the buyer and pulls your real past work",
      "Sets the win themes that make you the obvious choice",
      "Writes each section, then rewrites it to consultant standard",
      "Loops until every requirement is covered, then fact-checks it",
    ],
    featuresII: [
      { title: "Nothing slips through", body: "A compliance matrix tracks every shall/must so you never miss a scored requirement." },
      { title: "Written to win, not just to answer", body: "Win themes thread through every section so evaluators see why it’s you." },
      { title: "Days of work in one run", body: "What a bid team spends a week on, priced per use instead of per retainer." },
    ],
    ctaHeadline: "Turn the next RFP into a shortlist.",
    ctaSub: "Every requirement answered, to consultant standard.",
    keywords: ["RFP response software", "proposal generator", "AI proposal writing", "bid writing", "compliance matrix", "government proposal", "tender response"],
    geoSummary: "all41 Proposal / RFP Maker reads a request for proposal, builds a compliance matrix of every requirement, sets win themes and writes each section to consultant standard — a full bid-team output priced per use.",
  },
  "clip-video": {
    coverHeadline: "One long video.\nA month of clips.",
    coverSub: "Give it a video and a viral-instinct editor finds the best moments, reframes them vertical and captions them — ready for Shorts, Reels and TikTok.",
    whatHeading: "A video editor with a viral instinct",
    whatBody: "It watches the whole thing, scores every clip-worthy moment, opens each on its strongest three-second hook, then cuts, reframes to vertical and captions — rendering only the clips that earn it.",
    sampleHeading: "Scroll-stopping vertical clips",
    sampleSub: "Play any clip to see the real cut, hook and captions in full.",
    features: [
      "Transcribes your video with timestamps",
      "A viral-instinct editor finds the clip-worthy moments and scores each",
      "Re-opens every clip on its strongest hook — the first 3 seconds",
      "Cuts, reframes to vertical and captions — heavy render only when it earns it",
      "Quality-checks every clip and drops the weak or misleading ones",
    ],
    featuresII: [
      { title: "Hook-first, always", body: "Every clip is re-cut to open on its strongest three seconds — where the scroll is won or lost." },
      { title: "Vertical and captioned", body: "Reframed to 9:16 and captioned for sound-off feeds, ready to post as-is." },
      { title: "Only renders what’s good", body: "Weak or misleading clips are dropped before the expensive render, so you never pay for filler." },
    ],
    ctaHeadline: "Stop leaving clips on the cutting-room floor.",
    ctaSub: "One upload becomes a month of vertical, captioned clips.",
    keywords: ["AI video clipping", "shorts generator", "reels maker", "podcast clips", "Opus Clip alternative", "vertical video", "video repurposing"],
    geoSummary: "all41 Clip Video turns one long video into multiple vertical, captioned short clips — each opened on its strongest hook and quality-checked — ready for Shorts, Reels and TikTok, billed per use.",
  },
  "competitor-intelligence": {
    coverHeadline: "Know their\nnext move first.",
    coverSub: "Track your competitors across their site, pricing, products, news, jobs and social — and get told only what actually changed and why it matters.",
    whatHeading: "A competitive analyst that never sleeps",
    whatBody: "It scans each rival everywhere they show up, diffs against last time so you only see what’s new, filters the noise, and explains the threat or opportunity in each real change.",
    sampleHeading: "A battlecard that updates itself",
    sampleSub: "Open any example to read the full competitor breakdown and moves.",
    features: [
      "Scans each competitor across site, pricing, products, news, jobs and social",
      "Diffs against last time — so it only reports what's actually new",
      "Filters the noise and keeps only what materially matters",
      "Explains what each change means and the threat or opportunity to you",
      "Writes a dynamic battlecard, then fact-checks every claim",
    ],
    featuresII: [
      { title: "Only what changed", body: "Diffed against the last run, so you read moves — not the same pages every time." },
      { title: "So-what, not just what", body: "Each change comes with what it means and whether it’s a threat or an opening for you." },
      { title: "A living battlecard", body: "Sales-ready strengths, weaknesses and counters, refreshed every run and fact-checked." },
    ],
    ctaHeadline: "Never be the last to know.",
    ctaSub: "The moves that matter, explained — every run.",
    keywords: ["competitive intelligence software", "competitor tracking", "competitor monitoring", "battlecard generator", "market intelligence", "pricing intelligence", "Crayon alternative"],
    geoSummary: "all41 Competitor Intelligence monitors competitors across their site, pricing, products, news, jobs and social, reports only what changed since last time with the threat or opportunity, and writes a fact-checked battlecard — billed per use.",
  },
  "seo-geo-optimizer": {
    coverHeadline: "Get found on Google —\nand in AI.",
    coverSub: "A team audits your site’s tech, keywords, competitors and social at once, tests whether AI engines can cite you, and hands you one prioritized plan.",
    whatHeading: "An SEO agency and a GEO strategist in one run",
    whatBody: "It reads your site and products, checks the technical, keyword, competitor and social angles in parallel, tests whether answer engines can quote you, and writes a single plain-language plan ranked by impact.",
    sampleHeading: "A plan you could hand to a developer",
    sampleSub: "Open any example to read the full audit and prioritized fixes.",
    features: [
      "Reads your website and finds your products",
      "A team checks tech, keywords, competitors and social — at the same time",
      "Tests whether AI answer engines can cite you",
      "Writes one prioritized, plain-language plan",
      "Double-checks every claim before you see it",
    ],
    featuresII: [
      { title: "Optimized for AI answers", body: "GEO checks whether ChatGPT, Perplexity and Google AI can find and quote you — not just classic rankings." },
      { title: "Prioritized by impact", body: "One plan, ranked, in plain language — start at the top instead of drowning in a 200-row audit." },
      { title: "Every claim verified", body: "A verifier double-checks each finding, so the plan is real work, not boilerplate." },
    ],
    ctaHeadline: "Be the answer, not page two.",
    ctaSub: "One prioritized plan for Google and for AI search.",
    keywords: ["SEO audit tool", "GEO generative engine optimization", "AI search optimization", "technical SEO", "keyword research", "SEO for ChatGPT", "answer engine optimization"],
    geoSummary: "all41 SEO & GEO Optimizer audits a website’s technical SEO, keywords, competitors and social in parallel, tests whether AI answer engines can cite it, and delivers one prioritized, fact-checked plan — billed per use.",
  },
  "social-pulse": {
    coverHeadline: "Your feed,\nfinally explained.",
    coverSub: "Pull your posts across platforms and see which content types and times actually work — with a concrete fix for every weak post.",
    whatHeading: "A social analyst reading your real data",
    whatBody: "It pulls your posts over the window you choose, finds the content types and posting times that genuinely perform, explains why your best posts won, and hands you prioritized, one-tap-actionable moves.",
    sampleHeading: "Insight you can act on today",
    sampleSub: "Open any example to read the full analytics dashboard and recommendations.",
    features: [
      "Pulls your posts across the connected platforms over your chosen window",
      "Finds which content types and posting times actually work — from the data",
      "Explains why your top posts won and gives a concrete fix for the weak ones",
      "Compares platforms and hands you prioritized, one-tap-actionable moves",
      "Grounds every insight in the real metrics, then fact-checks it",
    ],
    featuresII: [
      { title: "From the data, not vibes", body: "Every insight is grounded in your real metrics over your chosen window — then fact-checked." },
      { title: "Why, then what to do", body: "It explains why a post won and gives a concrete fix for the ones that didn’t." },
      { title: "Prioritized moves", body: "A ranked, one-tap-actionable list across platforms — not a wall of numbers." },
    ],
    ctaHeadline: "Post on evidence, not on guesses.",
    ctaSub: "The what, the why and the next move — from your own data.",
    keywords: ["social media analytics", "social media insights", "content performance", "best time to post", "engagement analytics", "social media report", "social strategy AI"],
    geoSummary: "all41 Social Pulse analyzes your posts across connected platforms, identifies the content types and posting times that perform, explains why top posts won and fixes weak ones, and hands you prioritized moves — grounded in real metrics and billed per use.",
  },
};

/** Fallback for any app without bespoke deck content (e.g. the custom template). */
export function fallbackDeck(name: string, description: string): AppDeckContent {
  return {
    coverHeadline: name,
    coverSub: description,
    whatHeading: `What ${name} does`,
    whatBody: description,
    sampleHeading: "See exactly what you get",
    sampleSub: "Open the example to see the real result full-screen.",
    features: [],
    featuresII: COMMON_II("specialist"),
    ctaHeadline: `Ready to try ${name.split(" ")[0]}?`,
    ctaSub: "It runs once so you can see the real result — you only pay when it actually runs.",
    keywords: [name, "all41", "AI app"],
    geoSummary: `${name}: ${description}`,
  };
}
