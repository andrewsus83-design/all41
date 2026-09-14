/**
 * Sample results for the app previews ("See a sample") and the live marketing demos.
 * Client-safe plain data — no server imports. Each mirrors a crew output schema so the
 * real result renderer (ResultView) shows it exactly as a live run would. Nothing runs,
 * nothing is charged. Content is a realistic, professional-grade sample per app.
 */
export type DemoResult = { schema: string; result: unknown };

export const DEMO_RESULTS: Record<string, DemoResult> = {
  // ---------------- SEO & GEO Optimizer ----------------
  "seo-geo-optimizer": {
    schema: "seo_report",
    result: {
        "health_score": {
            "seo": 63,
            "geo": 34,
            "change_since_last": "first run"
        },
        "quick_wins": [
            {
                "action": "Rewrite the homepage title tag from \"Emberwood Coffee Roasters | Home\" to \"Emberwood Coffee Roasters | Fresh Single-Origin Beans, Roasted to Order\"",
                "why": "Your current title wastes the most valuable SEO real estate on the word \"Home\" and omits every phrase people actually search. \"Single-origin\" and \"roasted to order\" are the terms buyers type before they know your brand.",
                "expected_impact": "Higher click-through on the ~30 branded and non-branded impressions you already rank for; typically a 10-18% CTR lift on the homepage within 2-3 weeks with zero new content."
            },
            {
                "action": "Add unique 140-160 character meta descriptions to your 9 single-origin product pages (currently all inheriting the Shopify default \"Buy Ethiopia Guji online\")",
                "why": "Google is truncating and rewriting your snippets because they're near-identical across products, which suppresses CTR and signals thin differentiation.",
                "expected_impact": "Better CTR on product-page impressions and clearer relevance signals; these pages are your money pages, so even a 12% CTR gain compounds directly into revenue."
            },
            {
                "action": "Publish a \"How to Store Coffee Beans to Keep Them Fresh\" guide (900-1,200 words) and link it from every product page and the subscription page",
                "why": "You have zero informational content, so you capture buyers only at the moment of purchase and never earlier. This is the #1 storage question new specialty-coffee buyers ask.",
                "expected_impact": "Opens a top-of-funnel entry point for ~2,400 monthly searches on storage queries and creates the kind of self-contained answer that AI engines cite."
            },
            {
                "action": "Compress and convert your 14 hero and product images to WebP (several are 1.8-3.4 MB PNGs) and add descriptive alt text",
                "why": "Your largest product image is 3.4 MB, which drags mobile LCP past 4 seconds. Missing alt text also costs you Google Images traffic, a real channel for visual coffee-bag photography.",
                "expected_impact": "Faster mobile load (target LCP under 2.5s), a Core Web Vitals pass, and new image-search impressions; page-speed is a confirmed ranking and conversion factor."
            },
            {
                "action": "Add an FAQ section with Product schema + AggregateRating to the Emberwood Subscription page answering \"how often does it ship,\" \"can I skip or pause,\" and \"can I choose my beans\"",
                "why": "Your subscription page is your highest-LTV product but has no structured answers and no reviews markup, so it can't win rich results or be quoted by AI assistants comparing coffee clubs.",
                "expected_impact": "Eligibility for FAQ and review rich snippets, plus quotable content that assistants pull when users ask \"which coffee subscription lets you pause anytime.\""
            }
        ],
        "technical": [
            {
                "issue": "Homepage LCP is 4.1s on mobile due to an uncompressed 3.4 MB hero PNG loaded before render",
                "severity": "error",
                "fix": "Export the hero as a WebP under 200 KB, set explicit width/height to prevent layout shift, and add fetchpriority=\"high\" to the hero <img>. Lazy-load everything below the fold.",
                "affected_pages": [
                    "https://emberwoodcoffee.com/",
                    "https://emberwoodcoffee.com/collections/single-origin"
                ]
            },
            {
                "issue": "Faceted collection filters generate duplicate crawlable URLs (?sort_by, ?filter.p.tag) with no canonical tags",
                "severity": "warning",
                "fix": "Add rel=\"canonical\" pointing to the clean collection URL on all filtered variants, and disallow ?sort_by and ?filter parameters in robots.txt to preserve crawl budget.",
                "affected_pages": [
                    "https://emberwoodcoffee.com/collections/single-origin?sort_by=price-ascending",
                    "https://emberwoodcoffee.com/collections/all?filter.p.tag=light-roast"
                ]
            },
            {
                "issue": "No Product or Organization structured data detected sitewide",
                "severity": "warning",
                "fix": "Add Product schema (name, price, availability, aggregateRating) via a JSON-LD snippet in product.liquid, and Organization schema with logo and sameAs links in theme.liquid. Validate in Google's Rich Results Test.",
                "affected_pages": [
                    "https://emberwoodcoffee.com/products/ethiopia-guji-natural",
                    "https://emberwoodcoffee.com/products/colombia-huila-washed"
                ]
            },
            {
                "issue": "12 product pages have thin descriptions under 90 words, largely reusing the same tasting-note boilerplate",
                "severity": "warning",
                "fix": "Expand each to 150-250 words with unique origin story, farm/altitude, roast level, and brew recommendations. Google reads near-duplicate copy across products as low-value.",
                "affected_pages": [
                    "https://emberwoodcoffee.com/products/guatemala-antigua",
                    "https://emberwoodcoffee.com/products/kenya-nyeri-aa"
                ]
            },
            {
                "issue": "XML sitemap includes 7 unavailable/sold-out draft product URLs returning soft 404s",
                "severity": "info",
                "fix": "Set discontinued seasonal lots to redirect (301) to their origin collection, and let Shopify auto-prune them from sitemap.xml. Keep only live, indexable URLs in the sitemap.",
                "affected_pages": [
                    "https://emberwoodcoffee.com/sitemap_products_1.xml"
                ]
            }
        ],
        "keywords_content": [
            {
                "keyword": "best single-origin coffee beans",
                "intent": "commercial",
                "recommendation": "~8,100 searches/mo, and you rank nowhere on page 1. Build a \"Single-Origin Coffee: A Buyer's Guide\" pillar page that defines single-origin vs blends, then internally links to your 9 origin products. This is your biggest untapped commercial term."
            },
            {
                "keyword": "ethiopia guji natural coffee",
                "intent": "transactional",
                "recommendation": "~1,300 searches/mo with low competition and clear buy intent. You already stock it but the product title is \"Guji Natural\" only. Retitle to \"Ethiopia Guji Natural | Single-Origin Light Roast\" and add tasting notes and brew guide to own this exact-match term."
            },
            {
                "keyword": "monthly coffee subscription",
                "intent": "commercial",
                "recommendation": "~14,800 searches/mo, dominated by Trade and Atlas. You won't outrank them head-on, so target the long tail: \"coffee subscription you can pause\" and \"single-origin coffee subscription\" on a rebuilt subscription landing page with comparison content."
            },
            {
                "keyword": "how to store coffee beans",
                "intent": "informational",
                "recommendation": "~2,400 searches/mo. Pure top-of-funnel, zero competition from your rivals' product pages. A concise, well-structured answer here earns featured-snippet eligibility and becomes a frequently-cited source for AI assistants."
            }
        ],
        "competitors": [
            {
                "competitor": "Trade Coffee",
                "gap": "Trade ranks for \"coffee subscription\" and thousands of long-tail brew and origin queries because it runs a deep editorial blog (brew guides, roaster spotlights, quiz-driven matching). Emberwood has no editorial content at all.",
                "how_to_close": "You can't match their catalog, so out-specialize them: publish 6-8 origin-deep guides on the specific regions you roast (Guji, Huila, Nyeri) that Trade covers only shallowly. Depth on your actual lots beats their breadth for buyers who already want single-origin."
            },
            {
                "competitor": "Atlas Coffee Club",
                "gap": "Atlas owns the \"coffee from around the world\" narrative with rich country-story content and strong schema, so it earns rich snippets and AI citations for \"coffee subscription gift\" and \"international coffee.\"",
                "how_to_close": "Lean into roast-to-order freshness, a claim Atlas can't make at their scale. Build a \"Roasted the day it ships\" page and add Product + review schema so your freshness angle becomes the quotable differentiator in AI comparisons."
            },
            {
                "competitor": "Blue Bottle",
                "gap": "Blue Bottle has massive domain authority and brand-search volume, capturing users who search \"specialty coffee\" generically and then discover their beans.",
                "how_to_close": "Don't fight on authority. Win the geo-modified and micro-lot long tail Blue Bottle ignores: \"small-batch single-origin coffee,\" \"[your city] coffee roaster,\" and named-lot searches. Add a local landing page and Google Business Profile to capture regional intent they don't target."
            }
        ],
        "geo": [
            {
                "factor": "ChatGPT / Perplexity citability",
                "status": "Missing",
                "fix": "AI assistants cite pages that give complete, sourced answers. Your site is all product listings with no explanatory content, so nothing is quotable. Publish 4-5 self-contained guides (storage, single-origin explainer, roast levels, brew ratios) written as clear Q&A that an assistant can lift verbatim with attribution."
            },
            {
                "factor": "Structured data for AI extraction",
                "status": "Weak",
                "fix": "Add Product, FAQPage, and Organization JSON-LD schema. Generative engines lean on structured data to extract price, availability, ratings, and answers cleanly. Without it, your pages are harder for AI to parse and less likely to be surfaced in shopping and comparison responses."
            },
            {
                "factor": "Reddit / UGC presence",
                "status": "Missing",
                "fix": "AI models weight r/Coffee and r/roasting heavily when answering coffee questions. Emberwood has zero mentions. Seed authentic presence: answer brewing questions as a knowledgeable roaster (no spam), and encourage buyers to review lots on Reddit and Trustpilot so your name appears in the sources these engines train on."
            },
            {
                "factor": "Self-contained answers on-page",
                "status": "Weak",
                "fix": "Your product pages assume the visitor already knows what \"natural process\" or \"washed\" means. Add a short, standalone explainer beside each tasting note so the page answers the question fully on its own. Complete answers are what get pulled into AI overviews rather than skipped."
            }
        ],
        "social": [
            {
                "platform": "Instagram",
                "recommendation": "Coffee is deeply visual and Instagram is where specialty buyers discover roasters. Post consistent Reels of the roast process and pour-overs, put emberwoodcoffee.com in bio with a single-product link, and use origin hashtags (#singleorigin #ethiopiancoffee). Tag the specific farms; that story is your differentiator and it feeds back into brand search."
            },
            {
                "platform": "TikTok",
                "recommendation": "\"Coffee tok\" drives real subscription sign-ups. Run short educational hooks (\"Why fresh-roasted beans taste different,\" \"How to store your beans\") that repurpose your new blog guides. Video reinforces the freshness claim visually and captures the younger subscription-buyer demographic Trade and Atlas over-index on."
            }
        ],
        "sources": [
            {
                "ref": "C1",
                "quote": "Google Search Central: \"Descriptions... should optimally be both informative and interesting\" and unique per page."
            },
            {
                "ref": "C2",
                "quote": "Google: pages should demonstrate experience and expertise (E-E-A-T) to earn visibility for informational queries."
            },
            {
                "ref": "C3",
                "quote": "Core Web Vitals guidance: aim for an LCP of 2.5 seconds or less for a good mobile experience."
            }
        ],
        "flags": [
            "Sample preview — connect your Search Console and store data for a live, fully-sourced run."
        ],
        "confidence": 0.72
    },
  },

  // ---------------- Proposal / RFP Maker ----------------
  "proposal-rfp-maker": {
    schema: "proposal_report",
    result: {
        "executive_summary": "Riverside Parks & Recreation needs a website its 140,000 residents can actually use to register for programs, reserve pavilions, and report issues — but its aging Drupal 7 site is unsupported, fails WCAG 2.1 AA, and buries registration three clicks deep. Cedar & Pine Digital recommends a mobile-first WordPress redesign with a headless-ready CMS, ADA compliance baked in from day one, and a fixed price of $187,400 — 18% below the RFP's stated budget ceiling. We win on three themes the evaluators weighted most heavily: an accessibility-first technical approach (40 pts), a directly comparable municipal track record with the Cities of Fontana and Corona (30 pts), and certified California SB/Micro-Business status that adds the full 10 preference points at no risk to the panel. Cedar & Pine is the only bidder that pairs Section 508/WCAG remediation experience with parks-and-rec registration integrations, and we will prove it in a two-week pilot before the City spends a dollar on full build.",
        "compliance_matrix": [
            {
                "req_id": "L-1",
                "source_section": "L",
                "requirement": "Technical proposal shall not exceed 25 single-sided pages (excluding resumes, cover letter, and required forms), 11-point minimum font, 1-inch margins.",
                "status": "compliant",
                "response_location": "Volume I, entire document; page count certified on cover",
                "evidence": "Technical Volume is 23 pages at 11-pt Arial with 1-inch margins; resumes, Attachments A–D, and the cover letter are bound separately per L.4.2."
            },
            {
                "req_id": "L-2",
                "source_section": "L",
                "requirement": "Submit one (1) original wet-signed proposal, five (5) hard copies, and one (1) USB flash drive; sealed and marked with RFP #2024-PR-118 by 3:00 PM PT, November 14, 2024.",
                "status": "compliant",
                "response_location": "Transmittal Letter, page i",
                "evidence": "One original signed by Managing Partner Elena Marchetti, five copies, and a labeled USB with searchable PDF will be hand-delivered to the City Clerk, 3900 Main Street, by 2:15 PM PT on November 14."
            },
            {
                "req_id": "M-1",
                "source_section": "M",
                "requirement": "Technical Approach (40 points) evaluated on soundness of methodology, content migration plan, and demonstrated understanding of parks & recreation program registration workflows.",
                "status": "compliant",
                "response_location": "Volume I, Section 3 (Technical Approach), pp. 4–14",
                "evidence": "Our 4-phase Discovery-Design-Build-Launch methodology maps 1,900 legacy pages via automated crawl, integrates ActiveNet registration, and includes annotated wireframes for the program-search-to-checkout flow in Figure 3-2."
            },
            {
                "req_id": "M-2",
                "source_section": "M",
                "requirement": "Past Performance (30 points): provide three references for projects of similar size, scope, and complexity completed within the last five years for public-sector clients.",
                "status": "compliant",
                "response_location": "Volume II, Section 5 (Past Performance), pp. 1–6",
                "evidence": "Three municipal references — City of Fontana (2023), City of Corona Parks (2022), and Jurupa Community Services District (2021) — each a full CMS redesign with registration integration; contract values, contacts, and CPARS-style scorecards attached."
            },
            {
                "req_id": "SOW-1",
                "source_section": "SOW",
                "requirement": "The redesigned website shall conform to WCAG 2.1 Level AA and Section 508 standards, verified by third-party audit prior to acceptance.",
                "status": "compliant",
                "response_location": "Volume I, Section 3.5 (Accessibility & Compliance), pp. 11–13",
                "evidence": "Every template is audited against WCAG 2.1 AA using axe-core plus manual NVDA/VoiceOver testing; final VPAT and an independent audit by Level Access are delivered before UAT sign-off, at no added cost."
            },
            {
                "req_id": "SOW-2",
                "source_section": "SOW",
                "requirement": "Contractor shall migrate all existing content and provide a minimum of 16 hours of role-based CMS administrator training plus documentation.",
                "status": "partial",
                "response_location": "Volume I, Section 4.2 (Migration) & 4.4 (Training), pp. 15–18",
                "evidence": "We migrate all active content and deliver 20 hours of training (author, editor, admin roles) plus recorded videos; final scope of archived pre-2018 records pending the City's retention decision at kickoff, noted as an assumption."
            },
            {
                "req_id": "SOW-3",
                "source_section": "SOW",
                "requirement": "Provide hosting with 99.9% uptime SLA, daily backups, and 12 months of post-launch support and security patching.",
                "status": "partial",
                "response_location": "Volume I, Section 6 (Hosting & Support), pp. 20–22",
                "evidence": "WP Engine managed hosting delivers a contractual 99.95% uptime SLA, daily off-site backups, and 12 months of Cedar & Pine support; the City's preference for in-state data residency is offered as an optional add-on pending IT confirmation."
            }
        ],
        "proposal_sections": [
            {
                "section": "Technical Approach",
                "action_title": "Residents register in three taps, not three clicks lost",
                "content": "A mobile-first WordPress build with ActiveNet-integrated program search cuts the path from homepage to completed registration to three actions. Automated migration of all 1,900 legacy pages means no content is left behind at launch."
            },
            {
                "section": "Accessibility & Compliance",
                "action_title": "WCAG 2.1 AA passed before you ever accept the site",
                "content": "Accessibility is engineered into every template and verified by an independent Level Access audit prior to UAT — not patched afterward. The City receives a signed VPAT and a defensible compliance trail before acceptance."
            },
            {
                "section": "Past Performance",
                "action_title": "The same team that fixed Fontana's parks site is on yours",
                "content": "Cedar & Pine delivered comparable municipal CMS redesigns for Fontana, Corona, and Jurupa CSD, all on time and on budget. The named project lead, Elena Marchetti, ran all three engagements and will run Riverside."
            },
            {
                "section": "Price & Small-Business Value",
                "action_title": "18% under budget, plus the full 10 small-business points",
                "content": "Our fixed-firm price of $187,400 lands well below the RFP ceiling with no change-order surprises. As a certified California Small and Micro-Business, Cedar & Pine delivers the full 10 preference points at zero procurement risk."
            }
        ],
        "win_themes": [
            {
                "theme": "Accessibility engineered in, audited before acceptance",
                "hot_button": "The City's current site fails ADA and exposes it to complaint liability under Title II.",
                "discriminator": "Only bidder to include an independent third-party WCAG/508 audit and signed VPAT before UAT sign-off, at no extra cost.",
                "proof_point": "Zero accessibility findings on final audit for the City of Fontana redesign (2023), certified by Level Access."
            },
            {
                "theme": "Proven municipal parks-and-rec delivery",
                "hot_button": "Panel fears an agency that has never handled program registration or public-sector procurement.",
                "discriminator": "Three directly comparable parks & recreation CMS redesigns with registration integration in the last four years — same lead, same stack.",
                "proof_point": "City of Corona Parks reported a 34% rise in online program registrations within six months of our 2022 launch."
            },
            {
                "theme": "Lowest-risk price with full small-business preference",
                "hot_button": "Budget scrutiny and pressure to maximize the 10-point small-business set-aside.",
                "discriminator": "Fixed-firm $187,400 (18% under ceiling) combined with certified CA Small/Micro-Business status securing all 10 preference points.",
                "proof_point": "California DGS Small Business certification #1745882, active through 2026, verifiable in the Cal eProcure directory."
            }
        ],
        "compliance_summary": {
            "total": 7,
            "compliant": 5,
            "partial": 2,
            "missing": 0
        },
        "flags": [
            "Sample preview — connect your data for a live, sourced run."
        ],
        "sources": [
            {
                "ref": "RFP",
                "quote": "Technical Approach (40), Past Performance (30), Price (20), Small-Business status (10)."
            },
            {
                "ref": "RFP §SOW-1",
                "quote": "shall conform to WCAG 2.1 Level AA and Section 508 standards."
            },
            {
                "ref": "RFP §L-1",
                "quote": "shall not exceed 25 single-sided pages."
            }
        ],
        "confidence": 0.8
    },
  },

  // ---------------- Clip Video ----------------
  "clip-video": {
    schema: "clip_report",
    result: {
        "summary": "Scanned all 47:12 of \"How we bootstrapped to $1M ARR with no ads\" with founder Priya Nadkarni (Loomwork). Flagged 4 high-probability clips and dropped 2 weaker moments. The strongest cut is a genuine pattern-break: she claims turning down a $2.5M seed round is what got them to $1M — a contrarian founder take that stops the scroll in under 2 seconds. Each clip below is a ready-to-render spec with a rewritten first-line hook, tightened in/out points, and platform fit. Hooks are rewritten to front-load the surprising number or claim within the first 1.5s, because that's where 80% of the retention decision is made. Recommended posting order matches virality_score, top-down.",
        "clips": [
            {
                "title": "\"We said no to $2.5M — that's why we hit $1M\"",
                "start_sec": 1042,
                "end_sec": 1089,
                "duration_sec": 47,
                "virality_score": 92,
                "dimension_scores": {
                    "hook": 95,
                    "pacing": 89,
                    "engagement": 91
                },
                "hook_type": "Contrarian claim + specific dollar amount in first 1.5s",
                "why": "Priya turning down a $2.5M seed term sheet is a genuine pattern-break — the whole internet assumes raising = winning. She names the exact investor pressure and the exact reason she walked. The clip has a clean setup-turn-payoff arc inside 47s, and the closing line (\"ownership is the only moat nobody can dilute\") is a natural quote-tweet / stitch magnet. Original first line was throat-clearing (\"So, uh, around that time we were talking to a few funds...\") — rewritten hook drops you straight into the number.",
                "caption": "She turned down $2.5M. Then hit $1M ARR with zero ad spend. The math behind saying no 👇 #bootstrapping #startups #founderstory",
                "render_category": "A",
                "platform_fit": [
                    "TikTok",
                    "Reels",
                    "Shorts"
                ],
                "clip_file": "runs/demo/clip-1.mp4",
                "caption_file": "runs/demo/clip-1.captions.json",
                "status": "render_pending"
            },
            {
                "title": "The pricing mistake that cost them $400K",
                "start_sec": 1863,
                "end_sec": 1912,
                "duration_sec": 49,
                "virality_score": 84,
                "dimension_scores": {
                    "hook": 88,
                    "pacing": 82,
                    "engagement": 85
                },
                "hook_type": "Confessed mistake + quantified loss (regret hook)",
                "why": "Vulnerability plus a big round number. Priya admits they charged $29/mo for 14 months when the market would bear $99, and back-of-napkins it as roughly $400K left on the table. Founders and coaches save these 'don't-do-what-I-did' clips at a high rate, and the specificity ($29 → $99, 14 months) makes it feel like real data, not a platitude. Cut starts on the admission, not the wind-up.",
                "caption": "We charged $29 when we could've charged $99. For 14 months. Here's what that actually cost us 👇 #saas #pricing #startuplessons",
                "render_category": "B",
                "platform_fit": [
                    "TikTok",
                    "Reels",
                    "Shorts"
                ],
                "clip_file": "runs/demo/clip-2.mp4",
                "caption_file": "runs/demo/clip-2.captions.json",
                "status": "render_pending"
            },
            {
                "title": "How they got the first 100 customers from one Slack group",
                "start_sec": 744,
                "end_sec": 783,
                "duration_sec": 39,
                "virality_score": 78,
                "dimension_scores": {
                    "hook": 80,
                    "pacing": 79,
                    "engagement": 77
                },
                "hook_type": "Concrete tactic + exact channel named",
                "why": "Actionable and screenshot-worthy. She names the exact channel (the 6,000-member Online Geniuses Slack), the exact play (answering one question a day for 90 days, never pitching), and the exact result (first 100 paying users, zero ad spend). Tactical clips like this drive high saves and 'sending this to my cofounder' shares. Slightly lower ceiling because it's how-to rather than emotional, but very shareable inside founder circles.",
                "caption": "0 ads. 1 Slack group. First 100 paying customers. The 90-day rule she used 👇 #growth #bootstrapped #communityled",
                "render_category": "B",
                "platform_fit": [
                    "TikTok",
                    "Reels",
                    "Shorts"
                ],
                "clip_file": "runs/demo/clip-3.mp4",
                "caption_file": "runs/demo/clip-3.captions.json",
                "status": "render_pending"
            },
            {
                "title": "\"I had $1,100 left and almost shut it down\"",
                "start_sec": 2451,
                "end_sec": 2489,
                "duration_sec": 38,
                "virality_score": 73,
                "dimension_scores": {
                    "hook": 76,
                    "pacing": 74,
                    "engagement": 75
                },
                "hook_type": "Rock-bottom stakes + specific bank balance",
                "why": "Emotional relatability. Priya describes the month their account hit $1,100 and she'd drafted the shutdown email — then a single annual plan came in that Friday. The specificity of the balance and the drafted email makes it land as real, not a highlight-reel humblebrag. Strong comment-bait ('how close were you?'). Rewritten hook leads with the dollar figure instead of the original slow lead-in about 'a rough stretch in year two.'",
                "caption": "$1,100 in the bank. Shutdown email in drafts. Then Friday happened 👇 #foundersjourney #bootstrapping #startuplife",
                "render_category": "C",
                "platform_fit": [
                    "TikTok",
                    "Reels"
                ],
                "clip_file": "runs/demo/clip-4.mp4",
                "caption_file": "runs/demo/clip-4.captions.json",
                "status": "render_pending"
            }
        ],
        "dropped": [
            {
                "moment": "8:30–11:40 — Priya's 3-minute walk through Loomwork's onboarding funnel and activation metrics",
                "reason": "Substantively useful but visually flat and jargon-heavy (talks CAC, activation rate, cohort curves with no on-screen numbers). No clean hook in the first 3s and no emotional or contrarian turn — retention would drop off a cliff before the payoff."
            },
            {
                "moment": "38:05–39:20 — the host and Priya trading remote-work tool recommendations",
                "reason": "Off-topic tangent with two speakers talking over each other; no standalone claim, and it's tied to the host's question, so it can't be cut cleanly without confusing context."
            }
        ],
        "render_note": "Clip judgment runs live; video rendering (transcription, ffmpeg, Remotion) connects at build — each clip is delivered as a ready-to-render spec.",
        "flags": [
            "Sample preview — connect your data for a live, sourced run."
        ],
        "sources": [
            {
                "ref": "T1",
                "quote": "17:22 — \"They wanted 22% for two and a half million. I did the math on ownership and just... couldn't.\""
            },
            {
                "ref": "T2",
                "quote": "31:03 — \"We charged twenty-nine bucks for over a year. That's probably four hundred grand we just left sitting there.\""
            },
            {
                "ref": "T3",
                "quote": "40:51 — \"The month it got scary we had about eleven hundred dollars. I'd already written the email.\""
            }
        ],
        "confidence": 0.55
    },
  },

  // ---------------- Web Builder ----------------
  "web-builder": {
    schema: "website_report",
    result: {
        "live_url": "https://pawsh.all41.app",
        "status": "deploy_pending",
        "subdomain": "pawsh.all41.app",
        "pages": [
            {
                "type": "Home",
                "slug": "/",
                "headline": "We groom your dog in your driveway — you never leave home",
                "subhead": "Pawsh brings the full grooming salon to your curb across the Twin Cities metro. Book in 60 seconds, no cages, no car rides, no stress.",
                "value_prop": "One anxious-free appointment at your door: bath, haircut, nails, ears and teeth in a climate-controlled van, one groomer, one dog at a time.",
                "proof": [
                    "4.9 stars from 380+ Minneapolis-St. Paul pet parents",
                    "Self-contained van with its own water and power — nothing needed from your home",
                    "Same groomer every visit, so your dog knows the face and the routine"
                ],
                "cta": "Book my dog's first groom",
                "cta_href": "#book",
                "has_nav": false
            },
            {
                "type": "Services",
                "slug": "/services",
                "headline": "Flat-rate grooming priced by coat and size — no surprise add-ons",
                "subhead": "Pick the package that fits your dog. Every visit is one-on-one in the van and includes the wash, dry, brush-out, nails, and ear cleaning.",
                "value_prop": "Transparent packages from $75 so you know the price before we pull into the driveway — bath-only, full haircut, or the Pawsh Full Spa with teeth brushing and de-shed treatment.",
                "proof": [
                    "Freshen-Up Bath $75 · Full Haircut $95 · Pawsh Full Spa $130, all-in",
                    "Hypoallergenic and oatmeal shampoos for itchy and sensitive skin at no extra charge",
                    "De-shedding treatment that cuts loose fur up to 90% for double-coated breeds"
                ],
                "cta": "See prices for my breed",
                "cta_href": "#book",
                "has_nav": true
            },
            {
                "type": "About",
                "slug": "/about",
                "headline": "Started by a groomer who was tired of dogs shaking in cages",
                "subhead": "Maria Delgado spent nine years in high-volume salons before building Pawsh to do it the calm way — mobile, unhurried, one dog at a time.",
                "value_prop": "A licensed, insured groomer with 12 years of hands-on experience who handles seniors, puppies, and anxious rescues with patience most salons don't have time for.",
                "proof": [
                    "12 years grooming experience, fully licensed and insured in Minnesota",
                    "Certified in pet first aid and low-stress handling by Fear Free",
                    "Serving Minneapolis, St. Paul, Edina, Bloomington and Maple Grove since 2019"
                ],
                "cta": "Meet Maria and book",
                "cta_href": "#book",
                "has_nav": true
            },
            {
                "type": "Book",
                "slug": "/book",
                "headline": "Pick a time and we'll be at your curb — confirmed in seconds",
                "subhead": "Choose your dog's size, your package, and a morning or afternoon window. You'll get a text confirmation and a heads-up when the van is 20 minutes out.",
                "value_prop": "Real-time openings for the next two weeks with instant booking and secure card-on-file — reschedule free up to 24 hours before, no phone tag required.",
                "proof": [
                    "Average next-available slot within 3 days across the metro",
                    "Secure checkout with card on file — pay only after the groom is done",
                    "Free reschedule up to 24 hours out, plus automatic reminder texts"
                ],
                "cta": "Reserve my appointment",
                "cta_href": "#book",
                "has_nav": false
            }
        ],
        "style": {
            "palette": [
                "#1e1c1a",
                "#ff6b5e",
                "#f6f1e9"
            ],
            "typography": "Fraunces for warm, rounded display headlines paired with Inter for clean, highly legible body and UI text",
            "tone": "Warm, reassuring, and confident — speaks to a busy pet parent who wants zero hassle and a calm dog",
            "layout": "Single-column mobile-first flow: full-bleed hero with the van in a driveway, sticky Book button, price cards, groomer photo, review wall, and a booking widget anchored at the bottom of every page"
        },
        "seo_geo_baseline": {
            "summary": "Optimized to rank for 'mobile dog grooming near me' and metro-specific searches, with LocalBusiness and Service schema, embedded booking, and geo-targeted service-area pages that feed Google Business Profile and map packs.",
            "schema_present": true,
            "geo_notes": [
                "LocalBusiness + Service schema declares the Minneapolis-St. Paul service radius and per-package pricing so map and AI results show accurate coverage and prices",
                "Dedicated city landing sections for Edina, Bloomington and Maple Grove target 'mobile dog groomer [city]' long-tail queries competitors like Aussie Pet Mobile and Zoomin Groomin aren't ranking for locally",
                "NAP, hours, and review markup kept consistent with Google Business Profile to strengthen local pack and 'near me' visibility"
            ]
        },
        "conversion_notes": [
            "Sticky 'Book' button follows the user on every page so the primary action is always one tap away, especially on mobile where 70%+ of local pet searches happen",
            "Price transparency up front (from $75, no surprise add-ons) removes the biggest objection that makes visitors bounce to call a competitor",
            "Trust stack — 4.9 stars, 380+ reviews, licensed and insured, Fear Free certified — sits directly above each CTA to convert on the spot",
            "Instant booking with card-on-file and free rescheduling lowers commitment risk, turning browsers into confirmed appointments without a phone call"
        ],
        "checkout_linked": true,
        "render_note": "Copy, style, page structure and the SEO/GEO baseline are produced live; hosting at brand.all41.app connects at build.",
        "flags": [
            "Sample preview — connect your data for a live, sourced run."
        ],
        "sources": [
            {
                "ref": "B1",
                "quote": "76% of people who search for a local business on their phone visit within a day."
            },
            {
                "ref": "B2",
                "quote": "Displaying transparent, upfront pricing is one of the top drivers of local service conversions."
            }
        ]
    },
  },

  // ---------------- Content Pipeline ----------------
  "content-pipeline": {
    schema: "content_report",
    result: {
        "summary": "One founder lesson — \"Why we killed our free plan — and grew faster\" — expanded into a full week of on-brand content: a long-form article, a LinkedIn post, an X thread, a newsletter issue, and an Instagram caption, plus a Monday–Friday posting schedule. Central narrative: SaaS company Threadline removed its free tier, watched signups drop, but grew MRR from $47K to $71K in 90 days as churn fell from 9.2% to 4.1%.",
        "core": {
            "title_options": [
                "Why We Killed Our Free Plan — And Grew 51% in 90 Days",
                "Our Free Tier Was a Growth Trap. Here's What Happened When We Removed It.",
                "The Day We Deleted 'Free Forever' — And Our Best Quarter Started"
            ],
            "body": "For three years, Threadline ran a generous free plan. It felt like the safe choice. It was quietly killing us.\n\nThe math finally caught up. 68% of our users were on free, they filed 74% of our support tickets, and they converted at 1.9%. Meanwhile our paid churn sat at 9.2% — because half our \"customers\" had signed up on a whim they never intended to keep.\n\nSo in June, we did the scary thing: we killed the free plan. New users got a 14-day trial, then a card on file at $29/mo. No more free forever.\n\nSignups dropped 41% overnight. My co-founder and I did not sleep that week.\n\nThen the numbers turned. Trial-to-paid hit 27%. Support volume fell by half, so we shipped faster. Churn dropped from 9.2% to 4.1%. MRR went from $47K to $71K in 90 days — up 51%.\n\nThe lesson: free wasn't acquisition. It was a filter that let the wrong people in and made the right ones wait.\n\nCharge earlier. Your believers are already reaching for their card.",
            "takeaway": "A free plan can disguise itself as growth while quietly selecting for the users least likely to ever pay."
        },
        "repurposes": [
            {
                "channel": "LinkedIn",
                "content": "We killed our free plan in June.\n\nSignups dropped 41% the first week. I genuinely thought we'd made a $200K mistake.\n\nHere's what the free plan was actually costing us:\n\n→ 68% of users were on free\n→ They filed 74% of support tickets\n→ They converted at 1.9%\n→ Paid churn was stuck at 9.2%\n\nWe told ourselves free was \"top of funnel.\" It wasn't. It was a filter that let in everyone who was never going to pay — and buried the people who would.\n\nSo we replaced free-forever with a 14-day trial, card required.\n\n90 days later:\n\n→ Trial-to-paid: 27%\n→ Support tickets: down ~50%\n→ Churn: 9.2% → 4.1%\n→ MRR: $47K → $71K (+51%)\n\nThe support drop was the sleeper win. Half our tickets vanished, so the team finally shipped the roadmap instead of firefighting.\n\nIf your free tier is older than your last pricing conversation, run the numbers. You might be paying to slow yourself down.\n\nWhat's the pricing decision you're most afraid to make?",
                "hook_options": [
                    "We killed our free plan in June. Signups dropped 41% the first week. Then MRR grew 51%.",
                    "Our free plan wasn't acquisition. It was a filter that let the wrong people in — here's the data."
                ]
            },
            {
                "channel": "X",
                "content": "We killed our free plan.\n\nSignups dropped 41% overnight.\n\n90 days later MRR was up 51%.\n\nHere's the whole story 🧵\n\n1/ Threadline ran a free-forever plan for 3 years. Felt safe. Felt like \"top of funnel.\"\n\nIt was quietly capping our growth. The data made it undeniable.\n\n2/ The free tier by the numbers:\n\n• 68% of all users\n• 74% of support tickets\n• 1.9% conversion to paid\n\nWe were spending our best hours supporting people who'd never pay.\n\n3/ And it poisoned the paid metrics too.\n\nPaid churn: 9.2%. Way too high. Turns out a lot of \"customers\" upgraded on impulse and bailed a month later.\n\n4/ So in June we did the scary thing:\n\nNo more free. 14-day trial, card on file, $29/mo after.\n\nFirst week: signups down 41%. My co-founder and I did not sleep.\n\n5/ Then it turned:\n\n• Trial→paid: 27%\n• Support tickets: -50%\n• Churn: 9.2% → 4.1%\n• MRR: $47K → $71K (+51%)\n\n6/ The lesson:\n\nFree wasn't acquisition. It was a filter that let the wrong people in and made the right ones wait.\n\nCharge earlier. Your believers already have their card out.",
                "hook_options": [
                    "We killed our free plan. Signups dropped 41% overnight. 90 days later MRR was up 51%. 🧵",
                    "Everyone told us free-forever was our funnel. The data said it was our ceiling. A thread on the scariest pricing call we ever made 🧵"
                ]
            },
            {
                "channel": "Newsletter",
                "content": "Subject: The $24K/month we found by deleting one button\n\nHey — quick founder story this week, because it cost me a lot of sleep and I think you'll see yourself in it.\n\nFor three years, Threadline had a free plan. It was the default \"of course you offer free\" decision every SaaS founder makes and never revisits. We never revisited it. That was the mistake.\n\nWhen we finally pulled the reports, the free tier looked less like a funnel and more like a leak:\n\n- 68% of our users lived on free\n- They generated 74% of our support tickets\n- They converted to paid at 1.9%\n- And our paid churn was stuck at an ugly 9.2%\n\nWe were spending our scarcest resource — engineering and support hours — on the users least likely to ever pay us a dollar.\n\nSo in June we killed it. New users now get a 14-day trial with a card on file, then $29/mo. No free forever.\n\nThe first week was brutal. Signups fell 41%. Every instinct screamed that we'd just torched the top of our funnel.\n\nThen the real numbers arrived, and they told a different story:\n\n- Trial-to-paid climbed to 27%\n- Support volume dropped by roughly half\n- Churn fell from 9.2% to 4.1%\n- MRR went from $47K to $71K in 90 days — up 51%\n\nThe quiet hero was support. With half the ticket load gone, the team finally shipped the roadmap instead of triaging. Faster product → happier paying users → lower churn. The flywheel we'd been promising ourselves for a year finally spun.\n\nThe reframe I'd leave you with: a free plan isn't automatically acquisition. Sometimes it's a filter — one that admits the people who'll never buy and makes the people who would sit in a watered-down experience while they wait.\n\nIf your free tier is older than your last serious pricing conversation, block an hour this week and pull three numbers: free-user share, their share of support load, and their conversion rate. The decision might make itself.\n\nCharge earlier than feels comfortable. Your believers already have their card out.\n\n— Maya\n\nP.S. Reply and tell me the pricing change you keep avoiding. I read every one, and I'm collecting the best for a future issue.",
                "hook_options": [
                    "The $24K/month we found by deleting one button",
                    "We spent 3 years defending our free plan. One spreadsheet ended the argument."
                ]
            },
            {
                "channel": "Instagram",
                "content": "We killed our free plan. 🪦\n\nSignups dropped 41% the first week. I thought we'd blown it.\n\nThen 90 days later: MRR up 51%.\n\nHere's what the free tier was really costing us 👇\n\n• 68% of users were on free\n• They filed 74% of support tickets\n• They converted at just 1.9%\n• Paid churn stuck at 9.2%\n\nWe called it \"top of funnel.\" It was really a filter — letting in everyone who'd never pay, and making the people who would wait in a watered-down version.\n\nSo we swapped free-forever for a 14-day trial + card on file.\n\nThe result 90 days later:\n• Trial → paid: 27%\n• Support tickets: cut in half\n• Churn: 9.2% → 4.1%\n• MRR: $47K → $71K\n\nCharge earlier than feels comfortable. Your believers already have their card out. 💳\n\nSave this for the next time someone tells you free is free. 📌\n\n#saas #startups #founderlessons #pricing #bootstrapped #productgrowth #buildinpublic #b2b",
                "hook_options": [
                    "We deleted our free plan and grew 51%. Here's the math nobody shows you 👇",
                    "\"Free\" cost us $24K a month. We just didn't see it on any invoice."
                ]
            }
        ],
        "schedule": [
            {
                "channel": "LinkedIn",
                "when": "Monday",
                "piece_ref": "linkedin"
            },
            {
                "channel": "X",
                "when": "Tuesday",
                "piece_ref": "x"
            },
            {
                "channel": "Newsletter",
                "when": "Wednesday",
                "piece_ref": "newsletter"
            },
            {
                "channel": "Instagram",
                "when": "Thursday",
                "piece_ref": "instagram"
            },
            {
                "channel": "X",
                "when": "Friday",
                "piece_ref": "x"
            }
        ],
        "flags": [
            "Sample preview — connect your data for a live, sourced run on your real numbers."
        ],
        "sources": [
            {
                "ref": "R1",
                "quote": "Threadline internal metrics review, Q2 2026: \"free users = 68% of base, 74% of tickets, 1.9% conversion.\""
            },
            {
                "ref": "R2",
                "quote": "Founder retro doc: \"MRR $47K → $71K in 90 days; churn 9.2% → 4.1% post free-plan removal.\""
            }
        ],
        "confidence": 0.6
    },
  },

  // ---------------- Competitor Intelligence ----------------
  "competitor-intelligence": {
    schema: "competitor_report",
    result: {
        "summary": "Big week: two of your three tracked rivals moved on price and packaging within 48 hours of each other, and both moves point at the same wedge — your mid-market ($20-30/user) tier. Kanbanly launched a native AI standup-summary feature and quietly retired its free tier for new signups. Northbeam PM cut its Business plan 18% and started outbound-hiring 4 enterprise AEs. Slate Work shipped a Jira two-way sync and is running a 'switch off legacy PM' migration campaign aimed squarely at teams like your ICP. Net: the field is consolidating around AI-in-the-workflow + cheaper mid-tier + easier migration. Two responses this week — reprice/repackage your Team tier before Northbeam's cut resets buyer anchors, and get a migration story live before Slate Work owns that narrative.",
        "baseline": false,
        "changes": [
            {
                "competitor": "Northbeam PM",
                "signal": "pricing",
                "what_changed": "Cut the Business plan from $22 to $18/user/mo (billed annually) on Sep 9 and removed the 10-seat minimum. Annual-only discount messaging now leads the pricing page; monthly billing pushed below the fold.",
                "significance": "high",
                "why_it_matters": "This resets the buyer's price anchor right in your core band. Any deal you're in above ~$20/user now needs an explicit value defense, and procurement will cite the $18 number. Moving annual-only also signals they're optimizing for cash and retention ahead of a likely raise — expect more aggressive discounting in competitive deals for the next quarter."
            },
            {
                "competitor": "Kanbanly",
                "signal": "product",
                "what_changed": "Shipped 'AI Standups' on Sep 11 — auto-generates a daily written standup per board from activity + linked PRs, posts to Slack. Simultaneously removed the Free plan for new signups (existing free accounts grandfathered); entry point is now a 14-day trial of the $12 Starter plan.",
                "significance": "high",
                "why_it_matters": "The AI feature attacks the exact 'less status-meeting overhead' pain your buyers cite, and it's demo-friendly — it will show up in every eval. Killing Free is a monetization change that helps you at the very bottom (self-serve teams now have to pay Kanbanly on day one) but sharpens their paid ICP toward your mid-market. Have an AI-summary answer ready or you lose the eval on a checkbox."
            },
            {
                "competitor": "Slate Work",
                "signal": "product",
                "what_changed": "Released two-way Jira sync (GA Sep 12) and launched a 'Leave Legacy PM' campaign — a landing page, a side-by-side comparison grid, and a 90-day free migration offer with white-glove import. Comparison page targets keywords like 'Jira alternative' and 'Asana migration'.",
                "significance": "medium",
                "why_it_matters": "Migration friction is the #1 reason your prospects stall. Slate Work is trying to own the switching narrative and remove the single biggest objection in the category. If a prospect sees their comparison grid before they see yours, you're negotiating on their terms. You need a credible import + comparison asset live this week, not next quarter."
            },
            {
                "competitor": "Northbeam PM",
                "signal": "hiring",
                "what_changed": "Posted 4 new roles Sep 8-10: 3 Enterprise Account Executives (NY, Austin, remote) and 1 Sales Engineer, all tagged 'Enterprise' with '$100k+ ACV' language in the listings. First SE hire on record.",
                "significance": "medium",
                "why_it_matters": "Combined with the mid-tier price cut, this is a classic land-low, expand-up motion: win mid-market on price, then push into enterprise with humans. Their first Sales Engineer means they're about to start showing up in security reviews and RFPs where you used to win by default. Expect them in your larger deals within a quarter."
            }
        ],
        "intel": [
            {
                "competitor": "Northbeam PM",
                "meaning": "An 18% cut plus removing the seat floor is a deliberate move to undercut you and Kanbanly at the mid-market entry point, not a promotion — the pricing page architecture changed, not just a banner.",
                "likely_reason": "Preparing the growth story for a raise (SE + AE hiring supports this) and buying net-new logos with price while a sales team monetizes them upward.",
                "threat_or_opportunity": "Threat on new-logo price competition; opportunity on renewals — annual-only lock-in means their unhappy customers are trapped for 12 months and reachable at renewal. Build a 'coming off Northbeam annual' win-back play timed to their renewal cliffs."
            },
            {
                "competitor": "Kanbanly",
                "meaning": "They're betting the category's next eval checkbox is 'AI writes your status updates,' and they're willing to trade top-of-funnel volume (Free) for a cleaner paid ICP to sell that to.",
                "likely_reason": "Free tier was likely a support/cost drag with weak conversion; AI Standups is the flagship they want every trial to experience, so they moved everyone into a paid trial to force the aha.",
                "threat_or_opportunity": "Opportunity at the bottom — capture the self-serve teams Kanbanly just started charging on day one with a genuine free tier. Threat in evals — you need a shippable or roadmapped AI-summary answer so it doesn't read as a gap."
            },
            {
                "competitor": "Slate Work",
                "meaning": "They've decided switching cost is the category's real moat and are spending product + marketing to dissolve it, starting with the Jira-adjacent buyer.",
                "likely_reason": "Jira two-way sync + a migration offer is the cheapest way to poach installed-base users who otherwise wouldn't move; the SEO comparison push shows they're going after high-intent 'alternative' searchers, not brand demand.",
                "threat_or_opportunity": "Threat if you have no migration story; opportunity because their offer is 90-day/white-glove and hard to scale — a self-serve one-click importer plus an honest comparison page beats their high-touch motion on speed and trust."
            }
        ],
        "battlecards": [
            {
                "competitor": "Kanbanly",
                "strengths": [
                    "Slick, fast board UX with a loyal following among engineering teams; strong Slack and GitHub integrations",
                    "First-mover on visible in-product AI (AI Standups) — demos extremely well in evals",
                    "Simple, low $12 Starter entry price after the trial"
                ],
                "weaknesses": [
                    "Just removed Free — teams that want to try before paying now hit a paywall on day one",
                    "Weak on cross-project reporting and portfolio/roadmap views for managers above the team level",
                    "AI Standups is summary-only; no planning, estimation, or forecasting intelligence — thin once you scratch it",
                    "Limited permissions/admin controls for orgs above ~50 seats"
                ],
                "pricing": "Starter $12/user/mo, Pro $20, Business $32 (annual). No free tier for new signups as of Sep 11; 14-day trial only.",
                "positioning": "The fast, developer-loved kanban tool that now 'runs your standups for you.'",
                "how_to_win": [
                    "Lead with the free-tier gap: offer a real free plan so small teams can adopt without a card, then land-and-expand — Kanbanly forces payment on day one now.",
                    "Go one level up in the demo: show portfolio/roadmap and cross-project reporting for managers, where Kanbanly is thin — get the economic buyer, not just the engineers.",
                    "Neutralize AI as a checkbox, then reframe: 'summaries are table stakes — here's AI that helps you plan and catch slipping work,' so the eval isn't decided on their single feature."
                ]
            },
            {
                "competitor": "Northbeam PM",
                "strengths": [
                    "Now the cheapest credible mid-market option at $18/user (Business, annual)",
                    "Building an enterprise sales + SE motion — will show up in RFPs and security reviews",
                    "Clean, opinionated setup that non-technical teams adopt quickly"
                ],
                "weaknesses": [
                    "Annual-only discounting removes monthly flexibility — a real objection for budget-cautious buyers and a lock-in complaint at renewal",
                    "Removed the seat minimum but the low price is annual-commit; effective monthly price is notably higher",
                    "Enterprise motion is brand-new (first SE just posted) — security, SSO/SCIM, and admin depth are unproven at scale",
                    "Thin integration marketplace compared to incumbents"
                ],
                "pricing": "Starter $9/user/mo, Business $18 (annual, monthly billed higher), Enterprise custom. Business plan cut from $22 on Sep 9; annual commitment to get the headline price.",
                "positioning": "The affordable, easy-to-adopt PM tool — now leaning into 'enterprise-ready' as they hire up.",
                "how_to_win": [
                    "Reframe the $18 as annual-lock: 'their price needs a year commitment — ours doesn't, and you're not trapped if it doesn't work.' Sell flexibility to the budget owner.",
                    "Attack the unproven enterprise story in larger deals: put your SSO/SCIM, audit logs, and admin controls on the table early — their first SE was posted this month.",
                    "Time a win-back play to their annual renewals: capture their unhappy accounts at the 12-month cliff with a fast-migration offer, since they can't leave mid-term."
                ]
            }
        ],
        "trends": [
            "In-product AI is shifting from add-on to eval checkbox — first it was AI summaries/standups (Kanbanly this week); planning and forecasting intelligence is the next battleground. Ship a credible AI answer or lose evals on a feature you're not even competing on.",
            "Migration friction is being weaponized: two-way syncs plus white-glove import offers (Slate Work) are how challengers poach installed bases. Whoever owns the 'switching is easy' narrative controls the top of the funnel — a one-click importer and an honest comparison page are now table stakes, not nice-to-haves.",
            "Mid-market pricing ($18-22/user) is compressing and moving annual-only as rivals optimize for cash and retention ahead of raises. Expect more aggressive discounting in competitive deals; defend on flexibility and value, not on matching the number."
        ],
        "filtered_noise_count": 5,
        "flags": [
            "Sample preview — connect your data for a live, sourced run."
        ],
        "sources": [
            {
                "ref": "C1",
                "quote": "Business plan now $18/user/mo, billed annually."
            },
            {
                "ref": "C2",
                "quote": "Introducing AI Standups — your daily update, written for you."
            },
            {
                "ref": "C3",
                "quote": "Leave legacy PM behind — free 90-day white-glove migration."
            }
        ],
        "confidence": 0.78
    },
  },
};
