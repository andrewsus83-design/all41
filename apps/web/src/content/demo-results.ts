/**
 * Dummy results for the live app demos (marketing). Client-safe plain data — no server imports.
 * Each mirrors a crew's output schema so the real result renderer (ResultView) shows it beautifully.
 * Nothing runs and nothing is charged; these are canned, clearly-flagged demo outputs.
 */
export type DemoResult = { schema: string; result: unknown };

export const DEMO_RESULTS: Record<string, DemoResult> = {
  // ---------------- SEO & GEO Optimizer ----------------
  "seo-geo-optimizer": {
    schema: "seo_report",
    result: {
      health_score: { seo: 68, geo: 41, change_since_last: "first run" },
      quick_wins: [
        { action: "Add a unique meta description to the Candles page", why: "It's missing, so Google writes its own — usually worse.", expected_impact: "Higher click-through within days." },
        { action: "Add FAQ schema with 3–5 real questions", why: "AI answer engines lift Q&A-structured content; you have none.", expected_impact: "First step to being cited by ChatGPT/Perplexity." },
        { action: "Compress the 4 largest homepage images", why: "They push LCP over 2.5s on mobile.", expected_impact: "Faster load, small ranking lift." },
      ],
      technical: [
        { issue: "Missing meta descriptions on 6 pages", severity: "warning", fix: "Write a 150-char description per page.", affected_pages: ["/products"] },
        { issue: "LCP 3.1s on mobile homepage", severity: "warning", fix: "Compress hero image, defer non-critical JS.", affected_pages: ["/"] },
        { issue: "No XML sitemap found", severity: "error", fix: "Generate and submit a sitemap.xml.", affected_pages: [] },
      ],
      keywords_content: [
        { keyword: "handmade soy candles gift", intent: "commercial", recommendation: "Write a gift-guide page — the SERP is all gift content." },
        { keyword: "candle subscription box", intent: "transactional", recommendation: "Add a clear subscription page; a competitor owns this term." },
      ],
      competitors: [
        { competitor: "a competitor", gap: "They rank for 40 informational keywords via a blog you don't have.", how_to_close: "Start a small resource hub answering buyer questions." },
      ],
      geo: [
        { factor: "Structured data (schema.org)", status: "Missing", fix: "Add Product + FAQ + Organization schema." },
        { factor: "Reddit / UGC presence", status: "None found", fix: "Get mentioned in relevant subreddits — AI engines cite Reddit heavily." },
        { factor: "Self-contained answers", status: "Weak", fix: "Lead each page with a sentence that fully answers its query." },
      ],
      social: [{ platform: "LinkedIn", recommendation: "No company page found — create one; it feeds AI citability." }],
      sources: [{ ref: "C1", quote: "Crawled the site — demo data (connect data keys for a live audit)." }],
      flags: ["Demo run on placeholder data — connect the data sources in /admin for a live, sourced audit."],
      confidence: 0.4,
    },
  },

  // ---------------- Proposal / RFP Maker ----------------
  "proposal-rfp-maker": {
    schema: "proposal_report",
    result: {
      executive_summary: "We recommend delivering the scope through a phased, low-risk approach led by a team with directly relevant past performance. This proposal answers every requirement, maps our strengths to your evaluation criteria, and prices the work transparently.",
      compliance_matrix: [
        { req_id: "L-1", source_section: "L", requirement: "Submit a technical volume, max 20 pages", status: "compliant", response_location: "Technical Approach", evidence: "18-page technical volume drafted" },
        { req_id: "M-1", source_section: "M", requirement: "Demonstrate relevant past performance", status: "compliant", response_location: "Past Performance", evidence: "3 relevant references" },
        { req_id: "SOW-3", source_section: "SOW", requirement: "Provide a 90-day implementation plan", status: "partial", response_location: "Implementation", evidence: "Plan drafted — confirm dates" },
      ],
      proposal_sections: [
        { section: "Executive Summary", action_title: "A phased approach that is live in 90 days at lower risk", content: "SCQA-framed summary leading with the recommendation, then three grouped arguments." },
        { section: "Technical Approach", action_title: "Our method removes the two risks that sink projects like this", content: "Answer-first, MECE breakdown with a so-what on each step." },
      ],
      win_themes: [
        { theme: "Lower delivery risk through a proven phased method", hot_button: "on-time delivery", discriminator: "3 comparable projects delivered on schedule", proof_point: "past-performance references" },
      ],
      compliance_summary: { total: 3, compliant: 2, partial: 1, missing: 0 },
      flags: ["Demo run on a sample RFP. Paste your real RFP and connect an AI key in /admin for a live, fact-checked draft."],
      sources: [{ ref: "RFP", quote: "Sample solicitation — demo data." }],
      confidence: 0.5,
    },
  },

  // ---------------- Clip Video ----------------
  "clip-video": {
    schema: "clip_report",
    result: {
      summary: "3 vertical clips from a 45-min source — hook-scored, opened on their strongest beat, and quality-checked.",
      clips: [
        { title: "The result nobody expected", start_sec: 132, end_sec: 173, duration_sec: 41, virality_score: 88, dimension_scores: { hook: 92, pacing: 84, engagement: 88 }, hook_type: "Product/Outcome Showcase", why: "Opens on the finished transformation in the first 2s — the highest-performing hook type.", caption: "Here's what six months of this actually produced.", render_category: "B", platform_fit: ["TikTok", "Reels", "Shorts"], clip_file: "runs/demo/clip-1.mp4", caption_file: "runs/demo/clip-1.captions.json", status: "render_pending" },
        { title: "Everyone's doing this wrong", start_sec: 640, end_sec: 674, duration_sec: 34, virality_score: 79, dimension_scores: { hook: 82, pacing: 78, engagement: 77 }, hook_type: "Contrarian/Myth-Bust", why: "Rejects a widely-held belief in sentence one; the scroll stops.", caption: "The advice you keep hearing is backwards — here's why.", render_category: "B", platform_fit: ["TikTok"], clip_file: "runs/demo/clip-2.mp4", caption_file: "runs/demo/clip-2.captions.json", status: "render_pending" },
        { title: "6 years in, the real answer", start_sec: 1180, end_sec: 1227, duration_sec: 47, virality_score: 71, dimension_scores: { hook: 70, pacing: 74, engagement: 69 }, hook_type: "Credibility + Curiosity + Payoff", why: "Credibility → curiosity → payoff-promise across the first 3s.", caption: "I spent six years on this, and the real answer isn't what they tell you.", render_category: "B", platform_fit: ["TikTok"], clip_file: "runs/demo/clip-3.mp4", caption_file: "runs/demo/clip-3.captions.json", status: "render_pending" },
      ],
      dropped: [{ moment: "18:20 aside on scheduling", reason: "Not self-contained — leans on an earlier segment; would confuse a cold viewer." }],
      render_note: "Clip judgment runs live; video rendering (transcription, ffmpeg, Remotion) connects at build — each clip is delivered as a ready-to-render spec.",
      flags: ["Demo run on placeholder data.", "Virality scores are a strong shortlist, not a guarantee — post the high scorers first."],
      sources: [{ ref: "T1", quote: "Transcript of the sample video — demo data." }],
      confidence: 0.4,
    },
  },

  // ---------------- Web Builder ----------------
  "web-builder": {
    schema: "website_report",
    result: {
      live_url: "https://your-brand.all41.app",
      status: "deploy_pending",
      subdomain: "your-brand.all41.app",
      pages: [
        { type: "Home", slug: "/", headline: "Bookkeeping for freelancers — done in 10 minutes a month", subhead: "Benefit-led, specific, written to convert.", value_prop: "We keep your books clean so you never dread tax season — in minutes, not weekends.", proof: ["1,200+ freelancers served", "Avg. 6 hours saved a month", "Flat monthly price, no surprises"], cta: "Start free", cta_href: "#checkout", has_nav: false },
        { type: "About", slug: "/about", headline: "Why we exist", subhead: "The short, honest story.", value_prop: "We help freelancers who'd rather do their craft than their books.", proof: ["Founded by an ex-freelancer", "Certified bookkeepers"], cta: "Start free", cta_href: "#checkout", has_nav: true },
      ],
      style: { palette: ["#1e1c1a", "#ff6b5e", "#f6f1e9"], typography: "Clean — a readable sans with generous sizing", tone: "clean", layout: "full-bleed hero, single-column mobile-first, repeated CTA" },
      seo_geo_baseline: { summary: "Schema, meta and a Q&A block baked in at build — ready to be cited by AI answer engines.", schema_present: true, geo_notes: ["Self-contained answer sentence in the hero", "FAQ block with 3 real questions", "Organization + Service schema"] },
      conversion_notes: ["Single primary CTA, repeated near the hero and the end", "No nav on the landing page (keeps the visitor on one path)", "CTA above the fold on mobile", "Proof placed after the value prop, before the final CTA"],
      checkout_linked: true,
      render_note: "Copy, style, page structure and the SEO/GEO baseline are produced live; hosting at brand.all41.app connects at build (one Vercel multi-tenant renderer + wildcard subdomain).",
      flags: ["Demo run on placeholder data.", "Publishing to brand.all41.app is pending the hosting connection."],
      sources: [{ ref: "B1", quote: "Brand profile — demo data." }],
      confidence: 0.5,
    },
  },

  // ---------------- Content Pipeline ----------------
  "content-pipeline": {
    schema: "content_report",
    result: {
      summary: "A week of content from one idea — a core piece plus 3 channel-native repurposes, in your brand voice.",
      core: {
        title_options: ["The one thing most founders get wrong about pricing", "Pricing isn't a number — it's a story (with the data)", "Stop guessing at pricing — here's the playbook"],
        body: "# The one thing most founders get wrong about pricing\n\nMost pricing advice is generic. Here's the specific angle that actually moves revenue, grounded in what's working now — and the one change you can make today.\n\n(Demo body — a live run writes the full research-grounded piece in your brand voice.)",
        takeaway: "Anchor on value delivered, not cost-plus — then test one tier at a time.",
      },
      repurposes: [
        { channel: "LinkedIn", content: "I raised prices 30% and lost zero customers. Here's the one thing I changed first… (demo — a live run writes this natively for LinkedIn).", hook_options: ["The pricing mistake I see every week", "Nobody talks about this part of pricing"] },
        { channel: "X", content: "1/ Pricing isn't a number, it's a story. A thread on what actually changed our conversion → (demo).", hook_options: ["Your price is a story, not a number", "We 2x'd revenue without new customers"] },
        { channel: "Newsletter", content: "This week: the pricing change that felt scary and paid off. One idea, one action for you to try. (demo).", hook_options: ["The scary pricing change", "One tier, one test"] },
      ],
      schedule: [
        { channel: "LinkedIn", when: "Monday", piece_ref: "linkedin" },
        { channel: "X", when: "Tuesday", piece_ref: "x" },
        { channel: "Newsletter", when: "Thursday", piece_ref: "newsletter" },
      ],
      flags: ["Demo run on placeholder data.", "Every stat in a live run is checked against its source before delivery."],
      sources: [{ ref: "R1", quote: "Seed idea — demo data." }],
      confidence: 0.5,
    },
  },

  // ---------------- Competitor Intelligence ----------------
  "competitor-intelligence": {
    schema: "competitor_report",
    result: {
      summary: "2 material changes across 3 competitors this week (5 noise items filtered out).",
      baseline: false,
      changes: [
        { competitor: "Rival A", signal: "pricing", what_changed: "Cut the Pro plan from $49 to $39/mo and removed the annual discount.", significance: "high", why_it_matters: "A land-grab on price — expect them to target your mid-tier customers next." },
        { competitor: "Rival B", signal: "hiring", what_changed: "Posted 4 senior engineering roles and a Head of Product.", significance: "medium", why_it_matters: "They're building something bigger — a major release is likely in 1–2 quarters." },
      ],
      intel: [
        { competitor: "Rival A", meaning: "Competing on price, not value.", likely_reason: "Pressure to hit growth targets before a raise.", threat_or_opportunity: "Opportunity: lean harder into the outcomes they can't match; don't follow them down on price." },
        { competitor: "Rival B", meaning: "Investing in product depth.", likely_reason: "Moving upmarket.", threat_or_opportunity: "Threat: they may leapfrog on features — ship your roadmap's differentiators first." },
      ],
      battlecards: [
        { competitor: "Rival A", strengths: ["Now the cheapest option", "Strong brand recognition"], weaknesses: ["Thin support", "Slower to ship", "Discounting signals margin pressure"], pricing: "$39/mo Pro (just cut)", positioning: "Budget-leaning", how_to_win: ["Lead on value and outcomes, not price", "Highlight your support and reliability", "Target the segment they underserve"] },
      ],
      trends: ["Rival A's second price cut this quarter — a pattern of margin pressure.", "Rival B has hired 7 engineers in 60 days."],
      filtered_noise_count: 5,
      flags: ["Demo run on placeholder competitors.", "Every change and battlecard point is checked against captured sources before delivery."],
      sources: [{ ref: "C1", quote: "Captured rival-a.com — demo data." }, { ref: "C2", quote: "Captured rival-b.com/careers — demo data." }],
      confidence: 0.7,
    },
  },
};
