/**
 * Sample examples for the app previews ("See a sample") — a gallery of finished, professional-grade
 * results per app. Client-safe plain data (no server imports). Each mirrors a crew output schema so the
 * real ResultView renders it exactly as a live run would. Nothing runs, nothing is charged.
 */
export type DemoExample = { label: string; schema: string; result: unknown };
export type DemoResult = { schema: string; result: unknown };

export const DEMO_EXAMPLES: Record<string, DemoExample[]> = {
  "seo-geo-optimizer": [
    {
      "label": "Coffee roaster",
      "schema": "seo_report",
      "result": {
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
      }
    },
    {
      "label": "Dental practice",
      "schema": "seo_report",
      "result": {
        "health_score": {
          "seo": 61,
          "geo": 33,
          "change_since_last": "first run"
        },
        "quick_wins": [
          {
            "action": "Add a dedicated \"Cosmetic Dentistry Denver\" service page separate from your general services list",
            "why": "Right now cosmetic work (veneers, whitening, Invisalign) is buried in one long /services page, so Google can't rank you for high-value cosmetic searches — those patients are worth $3,000–$8,000 each",
            "expected_impact": "Realistic path to page 1 for \"cosmetic dentist Denver\" within 90 days; ~120 extra qualified visits/month"
          },
          {
            "action": "Claim and fully complete your Google Business Profile — add all 5 service categories, hours, 15+ interior/exterior photos, and turn on messaging",
            "why": "70% of \"dentist near me\" clicks go to the Google Map pack, not the blue links. Your profile is missing the \"Cosmetic dentist\" secondary category and has only 3 photos",
            "expected_impact": "Map pack visibility for \"dentist near me\" in your 5-mile radius; typically 8–15 new appointment calls/month"
          },
          {
            "action": "Ask your last 30 happy patients for a Google review this week using a one-tap review link",
            "why": "You have 47 reviews at 4.6 stars; the two practices beating you in the map pack have 210 and 380. Review count is the #1 factor you can move fastest",
            "expected_impact": "Getting to 90+ reviews closes most of the map-pack ranking gap; compounding trust for both patients and AI answers"
          },
          {
            "action": "Add your phone number as clickable text in the header of every page and a sticky \"Book Appointment\" button on mobile",
            "why": "62% of your traffic is mobile, but the number is currently an image and there's no persistent booking button — you're losing ready-to-call visitors",
            "expected_impact": "Higher call and booking conversion from existing traffic; no new traffic needed, pure revenue recovery"
          },
          {
            "action": "Write one plain-English FAQ block answering \"How much do veneers cost in Denver?\" with a real price range",
            "why": "This is the exact question patients type before booking, and no Denver practice answers it directly — both Google and ChatGPT reward the page that gives a straight answer",
            "expected_impact": "Featured snippet potential plus citations in AI answers for a bottom-of-funnel, ready-to-buy query"
          }
        ],
        "technical": [
          {
            "issue": "Homepage takes 5.8 seconds to load on mobile; the hero image is a 2.4 MB uncompressed JPG",
            "severity": "warning",
            "fix": "Compress and resize the hero image to under 200 KB and serve it as WebP; this alone should cut load time roughly in half",
            "affected_pages": [
              "https://brightsmiledenver.com/",
              "https://brightsmiledenver.com/about"
            ]
          },
          {
            "issue": "No LocalBusiness/Dentist schema markup anywhere on the site, so search engines and AI tools can't reliably read your address, hours, or services",
            "severity": "error",
            "fix": "Add JSON-LD \"Dentist\" schema with name, address, phone, hours, and geo-coordinates to the homepage and contact page",
            "affected_pages": [
              "https://brightsmiledenver.com/",
              "https://brightsmiledenver.com/contact"
            ]
          },
          {
            "issue": "Four service pages share the same title tag \"BrightSmile Family Dental | Denver Dentist\"",
            "severity": "error",
            "fix": "Give each page a unique, keyword-specific title, e.g. \"Teeth Whitening in Denver | BrightSmile Family Dental\"",
            "affected_pages": [
              "https://brightsmiledenver.com/services/whitening",
              "https://brightsmiledenver.com/services/veneers",
              "https://brightsmiledenver.com/services/invisalign",
              "https://brightsmiledenver.com/services/cleanings"
            ]
          },
          {
            "issue": "Contact page is missing a meta description, so Google is auto-generating a poor snippet",
            "severity": "info",
            "fix": "Add a 150-character meta description with your neighborhood and a call to action, e.g. \"Book a visit at BrightSmile Family Dental in Wash Park, Denver. Same-week appointments — call (303) 555-0142.\"",
            "affected_pages": [
              "https://brightsmiledenver.com/contact"
            ]
          },
          {
            "issue": "12 images across the site have no alt text, including the smile-gallery before/after photos",
            "severity": "warning",
            "fix": "Add descriptive alt text like \"Before and after porcelain veneers, BrightSmile Denver patient\" — helps image search and accessibility",
            "affected_pages": [
              "https://brightsmiledenver.com/smile-gallery",
              "https://brightsmiledenver.com/services/veneers"
            ]
          }
        ],
        "keywords_content": [
          {
            "keyword": "dentist near me",
            "intent": "commercial",
            "recommendation": "~40,500 Denver-area searches/month. You can't win this in the blue links, so win it in the map pack — the Google Business Profile and review actions above are your play here, not a blog post"
          },
          {
            "keyword": "cosmetic dentist Denver",
            "intent": "commercial",
            "recommendation": "~1,900 searches/month, high intent. Build the dedicated cosmetic page with before/after photos, pricing ranges, and financing options; you currently rank #14 and page 1 is very winnable"
          },
          {
            "keyword": "how much do veneers cost",
            "intent": "informational",
            "recommendation": "~6,600 searches/month nationally, ~320 local. Write an honest pricing guide ($900–$2,500 per tooth in Denver) — this captures researchers before they book and feeds AI answer engines"
          },
          {
            "keyword": "book dentist appointment Denver",
            "intent": "transactional",
            "recommendation": "~590 searches/month, ready-to-book intent. Add an online booking page with a clear URL (/book) and same-week availability messaging; you have no dedicated booking page today"
          }
        ],
        "competitors": [
          {
            "competitor": "Cherry Creek Dental Group (cherrycreekdental.com)",
            "gap": "They rank #1 in the map pack for \"cosmetic dentist Denver\" with 380 reviews and 6 dedicated cosmetic service pages; you have 47 reviews and one combined services page",
            "how_to_close": "Split your services into individual pages (veneers, whitening, Invisalign, bonding) and run a 60-day review drive to reach 90+ reviews — you don't need to match 380, just cross the credibility threshold"
          },
          {
            "competitor": "Denver Smile Studio (denversmilestudio.com)",
            "gap": "They publish a monthly cosmetic-dentistry blog and own the featured snippet for \"veneers vs bonding\" — they show up in ChatGPT answers because their content directly answers patient questions",
            "how_to_close": "Publish 3 plain-English FAQ-style articles over the next quarter (veneers cost, whitening safety, Invisalign timeline) with clear question-and-answer formatting AI tools can lift"
          },
          {
            "competitor": "Highlands Family Dentistry (highlandsdentaldenver.com)",
            "gap": "Their site loads in 1.9 seconds and has full LocalBusiness schema; yours loads in 5.8 seconds with no schema, so they outrank you on technical quality even with fewer reviews",
            "how_to_close": "Fix the hero image and add Dentist schema (both in the technical list above) — this is a one-afternoon developer task that erases their technical edge"
          }
        ],
        "geo": [
          {
            "factor": "Citability in AI answers (ChatGPT, Google AI Overviews, Perplexity)",
            "status": "Missing",
            "fix": "When asked \"best cosmetic dentist in Denver,\" AI tools cite Cherry Creek Dental and directory sites, never you. Fix by publishing clear, factual service and pricing pages AI engines can quote, and getting listed on Healthgrades and Zocdoc with a complete profile"
          },
          {
            "factor": "Structured data / schema for AI parsing",
            "status": "Missing",
            "fix": "Add Dentist + FAQPage JSON-LD schema so AI models can reliably extract your services, location, and answers — schema is how machines read your site, and yours is currently invisible to them"
          },
          {
            "factor": "User-generated content and community signals (Reddit, forums)",
            "status": "Weak",
            "fix": "A r/Denver thread \"recommend a good dentist?\" from March has 40 comments and never mentions you. Encourage happy patients to answer these threads genuinely, and make sure your name is easy to remember and spell — AI models weigh these real conversations heavily"
          },
          {
            "factor": "Self-contained answers on the page",
            "status": "Weak",
            "fix": "Your pages describe services but never answer the direct question (\"how much,\" \"how long,\" \"does it hurt\"). Add short, complete answers at the top of each service page so both featured snippets and AI overviews can quote a full sentence without guessing"
          }
        ],
        "social": [
          {
            "platform": "Instagram",
            "recommendation": "Post before/after smile transformations (with patient consent) 2x/week using local hashtags like #DenverDentist and #WashParkDenver — cosmetic dentistry is visual and this is where prospective veneer patients browse before booking"
          },
          {
            "platform": "Google Business Profile Posts",
            "recommendation": "Publish a weekly Google Post (a whitening special, a new-patient offer, a team photo) — these show directly in your map listing, signal an active business to Google, and are the highest-ROI \"social\" channel for a local practice"
          }
        ],
        "sources": [
          {
            "ref": "C1",
            "quote": "BrightMap 2025 Local Search Ranking Factors: Google Business Profile signals and review volume account for the majority of map-pack ranking weight for \"near me\" queries."
          },
          {
            "ref": "C2",
            "quote": "Denver metro keyword volumes estimated from Google Keyword Planner and Search Console impression data, Aug–Sep 2026."
          },
          {
            "ref": "C3",
            "quote": "AI Overviews and ChatGPT preferentially cite pages with FAQ/LocalBusiness structured data and direct question-answer formatting (Search Engine Land, 2026)."
          }
        ],
        "flags": [
          "This is a sample preview generated from public data, not a full crawl of your site — connect your Search Console for exact numbers."
        ],
        "confidence": 0.72
      }
    },
    {
      "label": "B2B SaaS",
      "schema": "seo_report",
      "result": {
        "health_score": {
          "seo": 61,
          "geo": 33,
          "change_since_last": "first run"
        },
        "quick_wins": [
          {
            "action": "Rewrite the homepage title tag from \"Ledgerly | Cloud Accounting\" to \"Accounting Software for Small Business | Ledgerly\"",
            "why": "Your #1 target phrase isn't in the title, so Google can't tell the page is about it — QuickBooks and Xero both lead their titles with the term.",
            "expected_impact": "Homepage can move from page 3 to page 1-2 for \"accounting software for small business\" (~18,000 searches/mo) within 4-8 weeks; likely +150-300 clicks/mo."
          },
          {
            "action": "Add a visible FAQ block (6 questions) to ledgerly.io/pricing answering \"Is Ledgerly cheaper than QuickBooks?\", \"Does Ledgerly do payroll?\", \"Can I switch from Xero?\"",
            "why": "You're getting pricing-intent visitors but giving them no answers, so they bounce to comparison sites — and these exact questions are what buyers ask AI assistants.",
            "expected_impact": "Lower pricing-page bounce (currently ~68%) and earn FAQ rich results + AI citations; typically +10-15% demo starts from that page."
          },
          {
            "action": "Compress and lazy-load the 2.4MB hero animation on the homepage",
            "why": "The page takes 4.1s to load on mobile; every extra second past 2.5s measurably drops conversions and hurts rankings via Core Web Vitals.",
            "expected_impact": "LCP from ~4.1s to under 2.5s; small ranking lift sitewide plus an estimated +5-8% mobile conversion."
          },
          {
            "action": "Build one comparison page: ledgerly.io/vs/quickbooks with an honest feature + price table",
            "why": "\"ledgerly vs quickbooks\" and \"quickbooks alternative\" are high-intent searches you don't rank for at all, and buyers compare before they buy.",
            "expected_impact": "Capture bottom-funnel traffic (~2,900 searches/mo across variants); these pages convert 3-5x the site average."
          },
          {
            "action": "Claim and complete your Google Business Profile and G2 listing, then request reviews from your 12 happiest customers",
            "why": "You have zero third-party reviews; AI answers and \"best accounting software\" lists pull heavily from G2, Capterra, and Reddit, where you're invisible.",
            "expected_impact": "Entry into \"best accounting software for small business\" roundups and AI recommendations; compounding trust signal over 60-90 days."
          }
        ],
        "technical": [
          {
            "issue": "Homepage title tag omits the primary target keyword",
            "severity": "error",
            "fix": "Change the <title> to lead with \"Accounting Software for Small Business | Ledgerly\" and match the H1.",
            "affected_pages": [
              "https://ledgerly.io/"
            ]
          },
          {
            "issue": "Meta descriptions missing on 14 blog posts, so Google writes its own snippet",
            "severity": "warning",
            "fix": "Add a unique 150-character description with the target phrase and a benefit to each post.",
            "affected_pages": [
              "https://ledgerly.io/blog/small-business-bookkeeping-checklist",
              "https://ledgerly.io/blog/cash-vs-accrual-accounting"
            ]
          },
          {
            "issue": "No structured data (Organization, Product, FAQ, SoftwareApplication schema absent sitewide)",
            "severity": "error",
            "fix": "Add JSON-LD SoftwareApplication + AggregateRating on the homepage and pricing page, and FAQPage schema on the new FAQ block.",
            "affected_pages": [
              "https://ledgerly.io/",
              "https://ledgerly.io/pricing"
            ]
          },
          {
            "issue": "Four key pages are not in the XML sitemap and one returns a soft 404",
            "severity": "warning",
            "fix": "Regenerate sitemap.xml to include /features, /integrations, /security, and /pricing; return a proper 200 or 301 for /product (currently soft 404).",
            "affected_pages": [
              "https://ledgerly.io/sitemap.xml",
              "https://ledgerly.io/product"
            ]
          },
          {
            "issue": "Homepage LCP is 4.1s on mobile due to an uncompressed 2.4MB hero asset",
            "severity": "warning",
            "fix": "Serve the hero as WebP/AVIF, set explicit width/height, and lazy-load below-the-fold media.",
            "affected_pages": [
              "https://ledgerly.io/"
            ]
          }
        ],
        "keywords_content": [
          {
            "keyword": "accounting software for small business",
            "intent": "commercial",
            "recommendation": "Your money keyword (~18,000 searches/mo) — rebuild the homepage around it with the phrase in the title, H1, first paragraph, and image alt text, then support it with a /features hub."
          },
          {
            "keyword": "quickbooks alternative",
            "intent": "commercial",
            "recommendation": "~9,900 searches/mo and low brand loyalty at renewal — publish /vs/quickbooks and a \"5 QuickBooks alternatives compared\" post that honestly includes competitors; these rank fast and convert."
          },
          {
            "keyword": "free accounting software for small business",
            "intent": "transactional",
            "recommendation": "~12,100 searches/mo — if you have a free tier or trial, build /free with a clear comparison table; if not, target \"affordable\" instead of fighting a query you can't satisfy."
          },
          {
            "keyword": "how to do bookkeeping for a small business",
            "intent": "informational",
            "recommendation": "~6,600 searches/mo of future buyers — write a genuinely useful step-by-step guide with a downloadable checklist; it feeds the funnel and is exactly the kind of content AI assistants cite."
          }
        ],
        "competitors": [
          {
            "competitor": "QuickBooks (quickbooks.intuit.com)",
            "gap": "They own 40+ dedicated comparison and \"alternative\" pages plus 900+ help articles; you have a thin blog and no comparison content, so you never appear when buyers compare.",
            "how_to_close": "Ship 3 comparison pages (/vs/quickbooks, /vs/xero, /vs/wave) and lean into your price and simplicity angle where they're expensive and complex — you can't out-publish Intuit, so out-specific them."
          },
          {
            "competitor": "Xero (xero.com)",
            "gap": "Xero has a huge accountant/partner referral program and thousands of backlinks; your domain authority and referring domains are a fraction of theirs.",
            "how_to_close": "Start a lightweight accountant-partner page and get listed in 8-10 niche accounting directories and integration marketplaces (Stripe, Shopify app stores) for relevant, earned links — quality over volume."
          },
          {
            "competitor": "Wave (waveapps.com)",
            "gap": "Wave dominates \"free accounting software\" searches and shows up in nearly every AI answer for budget-conscious owners; you're absent from that conversation.",
            "how_to_close": "If you have a free or low-cost tier, create a clear /free or /pricing comparison that names Wave and states where you're better (support, invoicing limits); earn reviews so AI has a reason to mention you alongside them."
          }
        ],
        "geo": [
          {
            "factor": "Citability in AI answers (ChatGPT/Perplexity/Google AI Overviews)",
            "status": "Not cited",
            "fix": "Create clear, factual, quotable pages (pricing, features, comparisons) with plain claims AI can lift verbatim; when asked \"best accounting software for small business,\" you currently never appear — comparison and review presence is what changes that."
          },
          {
            "factor": "Structured data for machine understanding",
            "status": "Missing",
            "fix": "Add SoftwareApplication, Product, FAQPage, and Organization JSON-LD so assistants can reliably parse what Ledgerly is, what it costs, and who it's for."
          },
          {
            "factor": "Third-party validation (G2, Capterra, Reddit)",
            "status": "Absent",
            "fix": "Claim G2 and Capterra profiles, gather 15+ reviews, and answer real questions in r/smallbusiness and r/accounting — AI answers weight community and review sources heavily, and you have zero footprint there."
          },
          {
            "factor": "Self-contained answers on-page",
            "status": "Weak",
            "fix": "Add a short \"What is Ledgerly?\" summary and a FAQ that each answer a full question in 2-3 sentences without requiring context — assistants prefer passages they can quote whole."
          },
          {
            "platform_placeholder_do_not_use": "ignore"
          }
        ],
        "social": [
          {
            "platform": "LinkedIn",
            "recommendation": "Post twice a week as the founder: plain-language small-business finance tips and a monthly \"real customer switched from QuickBooks\" story — builds the founder trust that converts SMB buyers and seeds branded search."
          },
          {
            "platform": "YouTube",
            "recommendation": "Publish short \"How to [invoice / reconcile / do quarterly taxes] in Ledgerly\" walkthroughs; these rank in Google, get cited by AI, and answer the exact how-to questions buyers search before choosing."
          }
        ],
        "sources": [
          {
            "ref": "C1",
            "quote": "Google Search Console and PageSpeed Insights data for ledgerly.io, pulled 2026-09-14."
          },
          {
            "ref": "C2",
            "quote": "Keyword volumes from Ahrefs/Semrush US database, September 2026 snapshot."
          },
          {
            "ref": "C3",
            "quote": "AI Overview and Perplexity result checks for \"best accounting software for small business,\" run 2026-09-14."
          }
        ],
        "flags": [
          "This is a sample preview built for a fictional scenario (Ledgerly) to show the format — connect your real site for live audited data."
        ],
        "confidence": 0.72
      }
    }
  ],
  "proposal-rfp-maker": [
    {
      "label": "City parks RFP",
      "schema": "proposal_report",
      "result": {
        "title": "Parks & Recreation Website Redesign",
        "client": "City of Riverside · RFP #2024-PR-118",
        "prepared_by": "Prepared with all41",
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
      }
    },
    {
      "label": "Health IT RFP",
      "schema": "proposal_report",
      "result": {
        "title": "Managed IT & Cybersecurity Services",
        "client": "Meridian Health Group · RFP #MHG-2024-IT-07",
        "prepared_by": "Prepared with all41",
        "executive_summary": "Meridian Health Group operates 14 clinics and a 400-bed regional hospital on aging on-prem infrastructure, and every hour of downtime or an unpatched exposure now carries HIPAA and patient-safety consequences that the incumbent MSP has not contained. Northbridge Managed Technologies proposes a HITRUST-aligned, SOC-2 Type II delivery model with a 15-minute critical-incident response SLA and a named healthcare-dedicated engineering pod, replacing break-fix reactivity with 24x7x365 proactive monitoring and zero-trust segmentation. Our three win themes—provable healthcare security, guaranteed uptime economics, and a low-risk 90-day transition with zero patient-facing disruption—map directly to the four evaluation factors, and our pricing lands 11% under Meridian's stated three-year budget envelope. This proposal answers all 7 mandatory requirements and demonstrates, with references from three comparable health systems, why Northbridge is the lowest-risk path to compliance and continuity.",
        "compliance_matrix": [
          {
            "req_id": "L-1",
            "source_section": "L",
            "requirement": "Bidder shall submit a Transmittal Letter signed by an officer authorized to bind the firm, confirming a firm-fixed-price proposal valid for 120 days from the submission deadline of 2024-10-18.",
            "status": "compliant",
            "response_location": "Volume I, Transmittal Letter, p. 1",
            "evidence": "Signed by Karen DeLuca, Chief Executive Officer, with 120-day price validity and full acceptance of RFP #MHG-2024-IT-07 terms; no exceptions taken."
          },
          {
            "req_id": "L-2",
            "source_section": "L",
            "requirement": "Technical proposal shall not exceed 40 pages, 11-point font, 1-inch margins, with a completed Compliance Matrix (Attachment C) cross-referencing every requirement to a page location.",
            "status": "compliant",
            "response_location": "Volume II, Attachment C, pp. 2-4",
            "evidence": "Technical volume is 38 pages in 11-pt Arial with 1-inch margins; Compliance Matrix maps all L, M, and SOW requirements to exact page citations."
          },
          {
            "req_id": "M-1",
            "source_section": "M",
            "requirement": "Under Security & Compliance (30 pts), bidder shall demonstrate a current, independently audited security program (SOC 2 Type II or HITRUST) and describe HIPAA Security Rule safeguards applied to Meridian's ePHI.",
            "status": "compliant",
            "response_location": "Volume II, Section 3.2, pp. 12-17",
            "evidence": "Northbridge holds SOC 2 Type II (Schellman, audit period 2023-07 to 2024-06, zero exceptions) and HITRUST r2 certification; Section 3.2 maps 54 HIPAA Security Rule controls to our managed toolset with a signed BAA in Appendix D."
          },
          {
            "req_id": "M-2",
            "source_section": "M",
            "requirement": "Under Technical (35 pts), bidder shall describe its 24x7 SOC, EDR/SIEM tooling, and mean-time-to-detect and mean-time-to-respond metrics for the trailing 12 months.",
            "status": "compliant",
            "response_location": "Volume II, Section 2.1, pp. 6-10",
            "evidence": "US-based 24x7 SOC on CrowdStrike Falcon EDR + Microsoft Sentinel SIEM; trailing-12-month MTTD 4.2 minutes and MTTR 22 minutes across 61 client tenants, evidenced in the Appendix B metrics attestation."
          },
          {
            "req_id": "M-3",
            "source_section": "M",
            "requirement": "Under References (15 pts), bidder shall provide three references from healthcare organizations of comparable size served within the last 36 months, including contract value and a contactable sponsor.",
            "status": "compliant",
            "response_location": "Volume III, Section 5, pp. 30-33",
            "evidence": "Three named healthcare references (Cascade Regional Health, St. Anselm Physician Network, Lakeshore Surgical Partners), each 500-1,200 endpoints, $0.9M-$1.6M annual value, with active sponsor contacts and CSAT scores of 4.7-4.9/5.0."
          },
          {
            "req_id": "SOW-4",
            "source_section": "SOW",
            "requirement": "The awarded vendor shall achieve 99.9% availability for Tier-1 clinical systems (EHR, PACS, pharmacy) measured monthly, with financial credits for any breach of the availability SLA.",
            "status": "partial",
            "response_location": "Volume II, Section 4.3, pp. 22-24 and Appendix E (SLA Credit Schedule)",
            "evidence": "Northbridge commits to 99.9% Tier-1 availability with a tiered credit schedule; the 99.95% target Meridian references in the SOW cover memo requires the redundant secondary WAN circuit priced as Option Line 7, which we recommend but have not assumed as baseline."
          },
          {
            "req_id": "SOW-9",
            "source_section": "SOW",
            "requirement": "Vendor shall complete a full transition and knowledge transfer from the incumbent MSP within 90 days of award with zero unplanned downtime to patient-facing systems.",
            "status": "partial",
            "response_location": "Volume II, Section 6.1, pp. 26-28 (90-Day Transition Plan)",
            "evidence": "Our phased 90-day plan (Discovery, Parallel Run, Cutover) targets zero patient-facing downtime; the guarantee is contingent on Meridian granting read-only incumbent system access by Day 5, which we have flagged as a shared assumption pending kickoff confirmation."
          }
        ],
        "proposal_sections": [
          {
            "section": "Technical Approach",
            "action_title": "Cut clinical downtime to near-zero with a 24x7 SOC that detects threats in under 5 minutes",
            "content": "Northbridge replaces Meridian's reactive break-fix model with a proactive, US-based Security Operations Center running CrowdStrike Falcon EDR and Microsoft Sentinel SIEM across every endpoint, server, and clinical device. A named healthcare engineering pod—two senior engineers, one SOC lead, and a dedicated vCISO—owns your environment end to end, so escalations never restart from zero. We instrument all 14 clinics and the hospital core with continuous monitoring, automated patch orchestration on a 72-hour critical-CVE window, and a real-time dashboard Meridian's IT director can see at any time. Our trailing-12-month MTTD of 4.2 minutes and MTTR of 22 minutes are contractually reported monthly, turning security posture from a black box into a measured, improving metric."
          },
          {
            "section": "Security & Compliance",
            "action_title": "Pass your next HIPAA audit with an independently certified partner, not a promise",
            "content": "Compliance for a health system cannot rest on a vendor's self-attestation. Northbridge carries SOC 2 Type II (zero exceptions, Schellman) and HITRUST r2 certification, and we map 54 HIPAA Security Rule safeguards directly to the tooling that protects Meridian's ePHI—covered by a signed Business Associate Agreement on Day 1. We deploy zero-trust network segmentation to isolate PACS, EHR, and pharmacy systems, enforce phishing-resistant MFA across all privileged access, and maintain immutable, air-gapped backups tested quarterly against ransomware recovery objectives. Every control is evidenced in your monthly compliance report, so when auditors or the OCR ask, Meridian answers with documentation, not scramble."
          },
          {
            "section": "Price & Value",
            "action_title": "Land 11% under budget while eliminating the hidden cost of downtime and breach exposure",
            "content": "Our firm-fixed-price of $3.72M over three years lands 11% below Meridian's stated $4.18M envelope, with no change-order surprises: monitoring, patching, EDR/SIEM licensing, the SOC, and the vCISO are all in the base. The larger savings are the ones the incumbent has been costing you—an estimated $28,000 per hour of Tier-1 clinical downtime and the six-figure remediation cost of a single unpatched exposure. By moving from break-fix to prevention, Northbridge converts unpredictable incident spend into a flat, forecastable operating line. Option Line 7 (redundant WAN) is offered transparently for the 99.95% tier, so Meridian controls the availability-versus-cost tradeoff with full visibility."
          },
          {
            "section": "Transition & References",
            "action_title": "Switch MSPs in 90 days with zero patient-facing downtime, proven at three peer health systems",
            "content": "Vendor transitions are where healthcare organizations get hurt, so we de-risk it by design. Our phased 90-day plan—Discovery (Days 1-30), Parallel Run (Days 31-70), and staged Cutover (Days 71-90)—keeps the incumbent live until each system is verified under Northbridge management, targeting zero unplanned downtime to patient-facing systems. The same plan has been executed at Cascade Regional Health (900 endpoints) and St. Anselm Physician Network (620 endpoints) within the last 24 months, both with zero clinical downtime and CSAT above 4.7. Three contactable healthcare sponsors stand ready to confirm that Northbridge delivers what it commits, on the timeline it commits to."
          }
        ],
        "win_themes": [
          {
            "theme": "Provable healthcare security, not vendor promises",
            "hot_button": "Meridian faces HIPAA/OCR exposure and an incumbent that cannot document its controls, putting patient data and leadership at regulatory risk.",
            "discriminator": "SOC 2 Type II (zero exceptions) plus HITRUST r2, with 54 HIPAA safeguards mapped to live tooling and a Day-1 BAA—an independently audited posture most regional MSPs cannot claim.",
            "proof_point": "Schellman SOC 2 Type II report (2023-07 to 2024-06, zero exceptions) and current HITRUST r2 certificate, included in Appendix D."
          },
          {
            "theme": "Guaranteed uptime economics",
            "hot_button": "Clinical downtime at $28K/hour and unpredictable break-fix bills are draining Meridian's IT budget and disrupting patient care.",
            "discriminator": "Contractual 99.9% Tier-1 SLA with financial credits, 4.2-minute MTTD, and an all-inclusive fixed price 11% under budget—converting variable incident spend into a flat line.",
            "proof_point": "Trailing-12-month MTTD 4.2 min / MTTR 22 min across 61 tenants (Appendix B attestation) and a $3.72M vs. $4.18M budget comparison."
          },
          {
            "theme": "Low-risk transition with zero patient impact",
            "hot_button": "Meridian is wary of a rip-and-replace migration that could take clinical systems offline during the switch.",
            "discriminator": "A phased 90-day Parallel-Run cutover proven at two comparable health systems with zero unplanned clinical downtime—versus competitors who cut over in a single weekend window.",
            "proof_point": "Cascade Regional Health (900 endpoints) and St. Anselm Physician Network (620 endpoints) transitions completed within 24 months, both with zero patient-facing downtime."
          }
        ],
        "compliance_summary": {
          "total": 7,
          "compliant": 5,
          "partial": 2,
          "missing": 0
        },
        "flags": [
          "This is a sample preview generated from illustrative data, not a submitted proposal."
        ],
        "sources": [
          {
            "ref": "RFP",
            "quote": "Evaluation factors: Technical (35), Security & Compliance (30), Price (20), References (15) — RFP #MHG-2024-IT-07, Section M."
          },
          {
            "ref": "SOW",
            "quote": "Vendor shall achieve 99.9% availability for Tier-1 clinical systems measured monthly — RFP #MHG-2024-IT-07, SOW 4.3."
          },
          {
            "ref": "HHS HIPAA Security Rule",
            "quote": "45 CFR 164.308-164.312 administrative, physical, and technical safeguards for ePHI."
          }
        ],
        "confidence": 0.8
      }
    },
    {
      "label": "Brand refresh RFP",
      "schema": "proposal_report",
      "result": {
        "title": "Brand Refresh & Growth Marketing",
        "client": "Northwind Outdoor Co. · Retainer RFP",
        "prepared_by": "Prepared with all41",
        "executive_summary": "Northwind Outdoor Co. is scaling from a regional gear brand to a national direct-to-consumer contender, but its 2019 identity, fragmented paid channels, and flat 3.1% e-commerce conversion rate are capping growth against Cotopaxi, REI Co-op, and Backcountry. Basecamp Collective, a 22-person creative and growth agency in Bend, Oregon, proposes a 12-month Brand Refresh & Growth Marketing Retainer that pairs a full identity system with an always-on performance engine run by one dedicated pod. Our approach wins on three themes: a field-tested creative system that ships in 90 days, a strategy modeled on Northwind's own first-party data rather than category assumptions, and a senior team that stays on the account start to finish. This proposal answers every requirement in Sections L, M, and the SOW, and commits to a fixed $28,500/month retainer with a shared 15% media-efficiency bonus that ties our fee to your results.",
        "compliance_matrix": [
          {
            "req_id": "L-1",
            "source_section": "L",
            "requirement": "Proposal shall not exceed 25 pages, single-sided, 11-point minimum font, submitted as a single searchable PDF by 5:00 PM PT on Oct 3, 2026.",
            "status": "compliant",
            "response_location": "Cover Letter, p.1; format certified throughout",
            "evidence": "Submission is a 24-page searchable PDF set in 11-point Söhne; Basecamp Collective confirms delivery via the Northwind procurement portal ahead of the Oct 3 deadline."
          },
          {
            "req_id": "L-2",
            "source_section": "L",
            "requirement": "Offeror shall include three client references for brand refresh engagements completed within the last 36 months.",
            "status": "compliant",
            "response_location": "Section 6: Past Performance, p.19",
            "evidence": "We provide Ruffwear (2024 rebrand, +41% DTC revenue), Hydro Flask regional launch (2023), and Chaco footwear refresh (2025), each with a named contact and measurable outcome."
          },
          {
            "req_id": "L-3",
            "source_section": "L",
            "requirement": "Offeror shall disclose all subcontractors and the percentage of work performed by each.",
            "status": "partial",
            "response_location": "Section 5: Team & Staffing, p.16",
            "evidence": "We disclose one subcontractor, Lumen Studio (motion/video, 8% of scope); final photography partner selection is pending Northwind's approval of two shortlisted studios at kickoff."
          },
          {
            "req_id": "M-1",
            "source_section": "M",
            "requirement": "Creative (30 pts): Demonstrate a distinctive brand identity system and campaign concept tailored to the outdoor category.",
            "status": "compliant",
            "response_location": "Section 2: Creative Approach, p.6",
            "evidence": "We present the 'True North' identity system and 'Weather Any Season' campaign, including logo, typography, a topographic design language, and three concept boards mocked in-situ on packaging, PDP, and OOH."
          },
          {
            "req_id": "M-2",
            "source_section": "M",
            "requirement": "Strategy (30 pts): Provide a data-driven growth plan with defined KPIs, channel mix, and a 12-month roadmap.",
            "status": "compliant",
            "response_location": "Section 3: Growth Strategy, p.10",
            "evidence": "Our plan targets a 3.1%-to-4.8% conversion lift and a blended 3.2 ROAS across Meta, Google Performance Max, and CTV, with a quarter-by-quarter roadmap and a shared Looker Studio dashboard."
          },
          {
            "req_id": "M-3",
            "source_section": "M",
            "requirement": "Price (20 pts): Provide a fully loaded, itemized cost proposal for the 12-month retainer with no undisclosed pass-through fees.",
            "status": "partial",
            "response_location": "Section 7: Price, p.22",
            "evidence": "We itemize a fixed $28,500/month retainer covering all labor; media spend and third-party licensing are shown as transparent pass-throughs at cost, with exact ad budgets set jointly after the Q1 media audit."
          },
          {
            "req_id": "SOW-1",
            "source_section": "SOW",
            "requirement": "Contractor shall deliver a complete brand guidelines document within 90 days of contract award.",
            "status": "compliant",
            "response_location": "Section 4: Delivery Plan, p.14",
            "evidence": "Our 90-day plan delivers a 60-page brand guidelines system by Day 84, with two review gates at Day 30 (strategy lock) and Day 60 (identity lock) built into the schedule."
          }
        ],
        "proposal_sections": [
          {
            "section": "Creative Approach",
            "action_title": "A 'True North' identity that makes Northwind unmistakable on a crowded shelf",
            "content": "Northwind's current wordmark disappears next to Cotopaxi's color blocking and REI's heritage type. The 'True North' system fixes that with a custom topographic mark, a warm slate-and-ember palette drawn from high-desert light, and a display face (Canela paired with Söhne) that reads at both hangtag scale and billboard scale. The 'Weather Any Season' campaign centers real customers using Northwind gear in unglamorous conditions, shot documentary-style, giving you a library of authentic assets that outperform stock-styled competitor creative in cold-audience testing."
          },
          {
            "section": "Growth Strategy",
            "action_title": "Move conversion from 3.1% to 4.8% by spending against your data, not category myths",
            "content": "We open with a 30-day audit of your Shopify, Klaviyo, and Meta data to find where qualified traffic drops off, then rebuild the funnel around it: PDP restructures, a post-purchase flow that lifts repeat rate, and a channel mix that shifts spend into CTV and Performance Max where your first-party signal is strongest. KPIs are locked in Q1 (blended 3.2 ROAS, 4.8% conversion, 22% repeat-purchase rate) and tracked live in a shared Looker Studio dashboard so you never wait for a monthly report to see performance."
          },
          {
            "section": "Team & Staffing",
            "action_title": "One senior pod owns your account from kickoff to renewal, no hand-offs",
            "content": "You get a dedicated five-person pod: a brand strategy director, a creative director, a growth lead, a senior designer, and an account manager, each named with a bio in Section 5. The people who pitch you are the people who do the work; there is no bait-and-switch to junior staff after award. Lumen Studio handles motion and video as a disclosed 8% subcontractor, coordinated by our account manager so Northwind has a single point of contact throughout."
          },
          {
            "section": "Price",
            "action_title": "A fixed $28,500/month retainer with a bonus tied to the results you care about",
            "content": "Labor is a flat $28,500 per month for the full 12 months, fully loaded, with no surprise hourly overages. Media and licensing pass through at cost with monthly reconciliation. To align our incentives with yours, we cap our upside and add a shared bonus: if we exceed the agreed media-efficiency target, Basecamp earns 15% of the documented savings, so we only win bigger when Northwind's dollars stretch further."
          }
        ],
        "win_themes": [
          {
            "theme": "Field-tested creative that ships in 90 days",
            "hot_button": "Fear that a rebrand drags on for a year and stalls sales momentum",
            "discriminator": "A fixed 90-day identity delivery with Day-30 and Day-60 review gates written into the SOW",
            "proof_point": "Delivered Ruffwear's full rebrand in 88 days in 2024, driving a 41% DTC revenue increase within two quarters"
          },
          {
            "theme": "Strategy modeled on Northwind's own data",
            "hot_button": "Skepticism of agencies that recycle generic outdoor-category playbooks",
            "discriminator": "A 30-day first-party data audit that sets KPIs before a dollar of media is spent",
            "proof_point": "Hydro Flask regional launch hit a 4.1 ROAS by reallocating spend based on audited purchase data, beating the 2.8 category benchmark"
          },
          {
            "theme": "A senior team that stays on the account",
            "hot_button": "Being sold by principals then handed to junior staff after signing",
            "discriminator": "A named five-person pod contractually assigned for all 12 months with no substitution without approval",
            "proof_point": "Same Chaco pod ran the 2025 refresh end-to-end with zero staffing changes and a 97% client-satisfaction score at renewal"
          }
        ],
        "compliance_summary": {
          "total": 7,
          "compliant": 5,
          "partial": 2,
          "missing": 0
        },
        "flags": [
          "This is a sample preview generated to demonstrate the app; wire in your real RFP to produce a submission-ready response."
        ],
        "sources": [
          {
            "ref": "RFP",
            "quote": "Northwind Outdoor Co. — Brand Refresh & Growth Marketing Retainer; evaluated on Creative (30), Strategy (30), Team (20), Price (20)."
          },
          {
            "ref": "Section M — Evaluation Criteria",
            "quote": "Award will be made to the offeror providing the best value, with Creative and Strategy weighted most heavily."
          },
          {
            "ref": "Section L — Instructions to Offerors",
            "quote": "Proposals shall not exceed 25 pages and must be submitted as a single searchable PDF by 5:00 PM PT on Oct 3, 2026."
          }
        ],
        "confidence": 0.8
      }
    }
  ],
  "clip-video": [
    {
      "label": "YC startup talk",
      "schema": "clip_report",
      "result": {
        "summary": "4 clips from Michael Seibel's YC startup talk — the highest-signal moments, hook-scored, reframed vertical and caption-ready. Tap a timestamp to watch that moment.",
        "source_video": {
          "provider": "youtube",
          "id": "Pg72m3CjuK4",
          "title": "Everything We Teach at Y Combinator in 10 Minutes",
          "author": "Startup Istanbul"
        },
        "clips": [
          {
            "title": "The mistake founders make picking an idea",
            "start_sec": 68,
            "end_sec": 118,
            "duration_sec": 50,
            "virality_score": 89,
            "dimension_scores": {
              "hook": 92,
              "pacing": 85,
              "engagement": 88
            },
            "hook_type": "Contrarian / mistake",
            "why": "Opens on the #1 founder anxiety — 'is my idea any good?' — inside the first two seconds.",
            "caption": "Most founders pick the wrong idea for the same reason. Here's the test YC uses.",
            "render_category": "B",
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
            "title": "Launch before you're ready — here's why",
            "start_sec": 132,
            "end_sec": 184,
            "duration_sec": 52,
            "virality_score": 83,
            "dimension_scores": {
              "hook": 86,
              "pacing": 82,
              "engagement": 80
            },
            "hook_type": "Contrarian",
            "why": "Rejects the 'polish it first' belief in sentence one — the scroll stops.",
            "caption": "You don't need more features. You need to launch. The MVP trap, explained.",
            "render_category": "B",
            "platform_fit": [
              "TikTok",
              "Reels"
            ],
            "clip_file": "runs/demo/clip-2.mp4",
            "caption_file": "runs/demo/clip-2.captions.json",
            "status": "render_pending"
          },
          {
            "title": "The only growth number that matters early",
            "start_sec": 192,
            "end_sec": 246,
            "duration_sec": 54,
            "virality_score": 78,
            "dimension_scores": {
              "hook": 80,
              "pacing": 77,
              "engagement": 76
            },
            "hook_type": "Number / curiosity",
            "why": "Promises one specific metric — curiosity gap plus a concrete payoff.",
            "caption": "Forget vanity metrics. This is the one growth number YC founders obsess over.",
            "render_category": "B",
            "platform_fit": [
              "TikTok"
            ],
            "clip_file": "runs/demo/clip-3.mp4",
            "caption_file": "runs/demo/clip-3.captions.json",
            "status": "render_pending"
          },
          {
            "title": "What investors actually want to hear",
            "start_sec": 320,
            "end_sec": 372,
            "duration_sec": 52,
            "virality_score": 74,
            "dimension_scores": {
              "hook": 76,
              "pacing": 73,
              "engagement": 72
            },
            "hook_type": "Insider",
            "why": "Insider framing on a high-stakes topic every founder is anxious about.",
            "caption": "Fundraising isn't about the deck. Here's what actually moves investors.",
            "render_category": "A",
            "platform_fit": [
              "Shorts"
            ],
            "clip_file": "runs/demo/clip-4.mp4",
            "caption_file": "runs/demo/clip-4.captions.json",
            "status": "render_pending"
          }
        ],
        "dropped": [
          {
            "moment": "0:00 Introduction",
            "reason": "Housekeeping and speaker intro — not self-contained and no standalone hook."
          }
        ],
        "render_note": "Clip selection and hook-scoring run live against the transcript; the vertical render (reframe + captions) connects at build. Each clip ships as a ready-to-render spec with exact in/out points on the source.",
        "flags": [
          "Sample preview on a public YC talk (Startup Istanbul). Connect your own video for a live run."
        ],
        "sources": [
          {
            "ref": "V1",
            "quote": "Everything We Teach at Y Combinator in 10 Minutes — Startup Istanbul (youtu.be/Pg72m3CjuK4)"
          }
        ],
        "confidence": 0.62
      }
    },
    {
      "label": "Fitness YouTube",
      "schema": "clip_report",
      "result": {
        "summary": "Analyzed all 38:12 of \"The 5 lifts that fixed my back pain\" by strength coach Marcus Reyes and pulled the 4 segments with the highest breakout probability for short-form. The full episode buries its best hooks — the strongest moment (the L4-L5 disc story) doesn't land until 14:20, and the payoff lift sequence is spread across the back half. Each clip below is cut to a self-contained arc, with the first spoken line rewritten into a scroll-stopping hook and a caption tuned per platform. Ranked by virality_score; two weaker moments were dropped with reasons. Nothing is rendered yet — this pass is pure clip judgment on the transcript and pacing.",
        "clips": [
          {
            "title": "\"My MRI said I'd never deadlift again\" — the lift that proved it wrong",
            "start_sec": 862,
            "end_sec": 910,
            "duration_sec": 48,
            "virality_score": 91,
            "dimension_scores": {
              "hook": 94,
              "pacing": 88,
              "engagement": 90
            },
            "hook_type": "personal_stakes_reveal",
            "why": "This is the emotional spine of the whole video and it's buried at 14:22. Marcus names a specific diagnosis (herniated L4-L5), quotes a doctor telling him to stop lifting, then hard-cuts to him pulling 405. The named injury + authority figure being wrong is a proven retention pattern — viewers stay to see the contradiction resolve. Original opening line was throat-clearing (\"So a lot of people ask me about my history...\"); rewritten to lead with the MRI.",
            "caption": "A radiologist told me my lifting days were over. Three years later I pulled 405 pain-free. The difference wasn't rest — it was loading the exact pattern everyone told me to avoid. Here's lift #1. 🩻 #backpain #deadlift #straincoach",
            "render_category": "A",
            "platform_fit": [
              "Reels",
              "TikTok",
              "Shorts"
            ],
            "clip_file": "runs/demo/clip-1.mp4",
            "caption_file": "runs/demo/clip-1.captions.json",
            "status": "render_pending"
          },
          {
            "title": "Everyone stretches their hamstrings. That's why the pain keeps coming back.",
            "start_sec": 1655,
            "end_sec": 1696,
            "duration_sec": 41,
            "virality_score": 84,
            "dimension_scores": {
              "hook": 88,
              "pacing": 82,
              "engagement": 83
            },
            "hook_type": "contrarian_myth_bust",
            "why": "A clean myth-bust with a physical demo — Marcus shows the 90/90 hip lock and explains why chasing hamstring flexibility masks a weak posterior chain. Contrarian framing against a near-universal habit (\"stop stretching\") drives comment-section arguments, which is the strongest signal for Reels reach. Self-contained in 41s and needs zero setup from earlier in the video.",
            "caption": "Stop stretching your hamstrings for back pain. You're chasing flexibility when the real problem is a posterior chain that can't hold tension. Do this instead 👇 #mobility #lowerbackpain #coachingtips",
            "render_category": "A",
            "platform_fit": [
              "TikTok",
              "Reels"
            ],
            "clip_file": "runs/demo/clip-2.mp4",
            "caption_file": "runs/demo/clip-2.captions.json",
            "status": "render_pending"
          },
          {
            "title": "The 10-second test that tells you if your core is actually the problem",
            "start_sec": 512,
            "end_sec": 549,
            "duration_sec": 37,
            "virality_score": 78,
            "dimension_scores": {
              "hook": 82,
              "pacing": 80,
              "engagement": 74
            },
            "hook_type": "self_diagnostic_test",
            "why": "A do-it-with-me segment: Marcus walks through a dead-bug hold and tells viewers the exact failure point that means their deep core is the weak link. \"Try this right now\" clips over-index on saves and rewatches because people pause to test themselves. Slightly lower engagement because the payoff is instructional rather than emotional, but save rate on this format is consistently high on Shorts.",
            "caption": "10-second test: lie down, do a dead bug, and watch your lower back. If it lifts off the floor, THIS is why your back hurts under load. Save this one. #corestrength #backpainrelief #deadbug",
            "render_category": "B",
            "platform_fit": [
              "Shorts",
              "Reels",
              "TikTok"
            ],
            "clip_file": "runs/demo/clip-3.mp4",
            "caption_file": "runs/demo/clip-3.captions.json",
            "status": "render_pending"
          },
          {
            "title": "I added ONE lift and my morning stiffness disappeared in 3 weeks",
            "start_sec": 1988,
            "end_sec": 2020,
            "duration_sec": 32,
            "virality_score": 72,
            "dimension_scores": {
              "hook": 76,
              "pacing": 74,
              "engagement": 70
            },
            "hook_type": "timeline_result_promise",
            "why": "The lift #5 reveal (Jefferson curl) paired with a concrete before/after: waking up stiff every morning vs. gone in 3 weeks. Specific timeframe + relatable symptom (morning stiffness) is a solid hook, but it sits at 33:08 near the outro and the delivery is lower-energy, so it scores below the others. Still a strong standalone for a series post-2 or -3.",
            "caption": "One lift killed my morning back stiffness in 3 weeks — and almost nobody trains it. The Jefferson curl, loaded slow and light. Full progression in the comments. #jeffersoncurl #spinehealth #liftheavy",
            "render_category": "B",
            "platform_fit": [
              "Reels",
              "Shorts"
            ],
            "clip_file": "runs/demo/clip-4.mp4",
            "caption_file": "runs/demo/clip-4.captions.json",
            "status": "render_pending"
          }
        ],
        "dropped": [
          {
            "moment": "Gym gear + belt recommendation aside (07:40–09:15)",
            "reason": "Reads as a sponsor-style plug and has no hook or payoff on its own — low retention out of context and risks looking like an ad, which suppresses organic reach."
          },
          {
            "moment": "Q&A tangent about protein intake (24:30–26:10)",
            "reason": "Off-topic from the back-pain promise of the title; viewers who came for the lifts drop off, and it dilutes the series' through-line."
          }
        ],
        "render_note": "Clip judgment runs live; video rendering connects at build.",
        "flags": [
          "Sample preview — scores and cuts are illustrative for one example video, not a rendered result."
        ],
        "sources": [
          {
            "ref": "T1",
            "quote": "The radiologist looked at my L4-L5 and basically told me my lifting days were over."
          },
          {
            "ref": "T2",
            "quote": "Everybody stretches their hamstrings for this and it's exactly why the pain keeps coming back."
          },
          {
            "ref": "T3",
            "quote": "I added one lift — the Jefferson curl — and within three weeks the morning stiffness was just gone."
          }
        ],
        "confidence": 0.55
      }
    },
    {
      "label": "Comedy podcast",
      "schema": "clip_report",
      "result": {
        "summary": "From the 52-minute episode 'The Worst Job Interview of My Life' (Ep. 47), I scored 38 candidate moments and pulled the 4 clips most likely to travel. The gold is the mid-episode escalation where the story goes from bad to absurd: the fish tank line at 18:44 and the 'is this a test?' beat at 31:10 are the two strongest cold-opens on the tape. I re-cut every hook to land the tension in the first 2 seconds and stripped the throat-clearing intros the podcast format encourages. Top pick scores 91 on a fresh, self-contained payoff that needs zero context.",
        "clips": [
          {
            "title": "\"They asked me to feed the office fish. It was a job interview.\"",
            "start_sec": 1124,
            "end_sec": 1171,
            "duration_sec": 47,
            "virality_score": 91,
            "dimension_scores": {
              "hook": 94,
              "pacing": 88,
              "engagement": 90
            },
            "hook_type": "absurd-premise cold open",
            "why": "Self-contained and instantly weird: a job interview that opens with 'feed the fish' promises a payoff and delivers one. The confusion in the host's voice does the work no caption could. Zero setup needed, which is why it wins as a cold scroll-stopper.",
            "caption": "The interviewer slid a container of fish flakes across the desk and said 'let's see how you handle responsibility.' I hadn't sat down yet. #jobinterview #worststory #comedy",
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
            "title": "\"I asked if it was a test. He said 'everything is a test.'\"",
            "start_sec": 1870,
            "end_sec": 1908,
            "duration_sec": 38,
            "virality_score": 84,
            "dimension_scores": {
              "hook": 87,
              "pacing": 82,
              "engagement": 85
            },
            "hook_type": "quotable one-liner",
            "why": "The 'everything is a test' line is the most screenshot-and-stitch-able moment on the tape. It's a clean setup-punchline in under 4 seconds and invites the 'red flag' duet reaction that reliably pushes comment volume.",
            "caption": "Me: 'Sorry, is this part of the test?' Him, not blinking: 'Everything is a test.' I should have left right then. #redflags #interviewfromhell #storytime",
            "render_category": "A",
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
            "title": "\"The 'quick 5-minute chat' had a 6-person panel and a whiteboard.\"",
            "start_sec": 502,
            "end_sec": 540,
            "duration_sec": 38,
            "virality_score": 78,
            "dimension_scores": {
              "hook": 80,
              "pacing": 79,
              "engagement": 76
            },
            "hook_type": "relatable betrayal",
            "why": "Broad relatability drives the saves and 'this is why I hate interviewing' comments. Slightly slower than the top two because the payoff builds rather than snaps, but the whiteboard reveal lands well and the setup is universal.",
            "caption": "The email said 'casual 5-minute chat, super relaxed.' I walk in: six people, a whiteboard, and a timer already running. #corporate #interview #relatable",
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
            "title": "\"I got the rejection email before I made it to my car.\"",
            "start_sec": 2717,
            "end_sec": 2749,
            "duration_sec": 32,
            "virality_score": 72,
            "dimension_scores": {
              "hook": 74,
              "pacing": 76,
              "engagement": 71
            },
            "hook_type": "gut-punch closer",
            "why": "The fastest-rejection detail is a strong ending beat and works as a series finale post, but the humor needs the earlier context to fully hit, so it under-performs as a standalone cold open. Best deployed second in a 2-part sequence.",
            "caption": "Phone buzzed in the elevator. 'We've decided to move forward with other candidates.' The interview ended ninety seconds ago. #rejected #jobsearch #comedy",
            "render_category": "B",
            "platform_fit": [
              "TikTok",
              "Reels",
              "Shorts"
            ],
            "clip_file": "runs/demo/clip-4.mp4",
            "caption_file": "runs/demo/clip-4.captions.json",
            "status": "render_pending"
          }
        ],
        "dropped": [
          {
            "moment": "The 90-second aside about parking-garage rates near the office (24:05-25:40)",
            "reason": "Funny in the room but has no hook and needs local context; it kills momentum in a cold-open cut."
          },
          {
            "moment": "The host thanking the episode sponsor and reading the promo code (02:10-03:25)",
            "reason": "Ad read with no story value — never viable as a standalone clip."
          }
        ],
        "render_note": "Clip judgment runs live; video rendering connects at build.",
        "flags": [
          "Sample preview: clips scored from a representative transcript to show output quality; connect your real episode to render."
        ],
        "sources": [
          {
            "ref": "T1",
            "quote": "'Everything is a test,' he said, and slid the fish food closer to me."
          },
          {
            "ref": "T2",
            "quote": "The email had literally said 'super casual, five minutes, don't even prep.'"
          }
        ],
        "confidence": 0.55
      }
    }
  ],
  "web-builder": [
    {
      "label": "Dog grooming",
      "schema": "website_report",
      "result": {
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
            "has_nav": false,
            "image": "/samples/pawsh-hero.webp"
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
            "has_nav": true,
            "image": "/samples/pawsh-dog.webp"
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
            "has_nav": true,
            "image": "/samples/pawsh-groomer.webp"
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
      }
    },
    {
      "label": "Coffee roaster",
      "schema": "website_report",
      "result": {
        "live_url": "https://emberwood.all41.app",
        "status": "deploy_pending",
        "subdomain": "emberwood.all41.app",
        "pages": [
          {
            "type": "Home",
            "slug": "/",
            "headline": "Single-origin coffee, roasted to order in Asheville and shipped within 24 hours",
            "subhead": "Small-batch beans from named farms in Ethiopia, Colombia, and Guatemala, delivered at peak freshness so your first cup tastes the way the roaster intended.",
            "value_prop": "Skip the stale grocery-shelf bag. Every order is roasted the morning it ships, stamped with a roast date you can actually read, and backed by a taste-it-or-we'll-make-it-right guarantee.",
            "proof": [
              "Roasted the same day your order ships, never batched weeks ahead",
              "4.9/5 from 1,340+ verified reviews since 2021",
              "Free carbon-neutral shipping on orders over $35"
            ],
            "cta": "Shop this week's roast",
            "cta_href": "#shop",
            "has_nav": false,
            "image": "/samples/emberwood-hero.webp"
          },
          {
            "type": "Shop",
            "slug": "/shop",
            "headline": "Meet the beans behind your next favorite cup",
            "subhead": "Twelve rotating single-origins, each with tasting notes, farm details, and a brew guide so you dial it in the first time, no barista experience required.",
            "value_prop": "Filter by roast level, flavor profile, or brew method and know exactly what you're getting before you check out. Whole bean or ground to your setup, from pour-over to espresso.",
            "proof": [
              "Named farm, altitude, and process on every bag",
              "Whole bean or made-to-order grind for your exact brewer",
              "Sample flight: try any three origins for $18 shipped"
            ],
            "cta": "Browse single-origins",
            "cta_href": "/shop#beans",
            "has_nav": true
          },
          {
            "type": "Subscription",
            "slug": "/subscribe",
            "headline": "Fresh coffee on your counter before you run out, on your schedule",
            "subhead": "Pick your roast, pick your rhythm, and let a rotating single-origin arrive every 2, 4, or 6 weeks. Pause, swap, or cancel anytime in two clicks.",
            "value_prop": "Subscribers save 15% on every bag, ship free, and get first access to micro-lot releases that sell out in hours. No lock-in, no surprises, cancel from your account page whenever.",
            "proof": [
              "Save 15% and ship free on every recurring order",
              "Skip, pause, or reschedule with one tap, no emails required",
              "Early access to limited micro-lots before public release"
            ],
            "cta": "Start my subscription",
            "cta_href": "#subscribe",
            "has_nav": false
          },
          {
            "type": "About",
            "slug": "/about",
            "headline": "A two-person roastery obsessed with the 90 seconds that make a great cup",
            "subhead": "Emberwood started in 2021 on a 5kg roaster in a West Asheville garage. We still cup every batch by hand before it earns a bag.",
            "value_prop": "We buy from importers who pay above Fair Trade and name every farm we source from, so the price on the bag traces back to the people who grew it. Great coffee should be honest at every step.",
            "proof": [
              "Direct relationships with 7 farms across 3 continents",
              "Above-Fair-Trade pricing paid on 100% of our green coffee",
              "Every batch cupped and logged before it ships"
            ],
            "cta": "Read our sourcing promise",
            "cta_href": "/about#sourcing",
            "has_nav": true,
            "image": "/samples/emberwood-about.webp"
          }
        ],
        "style": {
          "palette": [
            "#2b1a10",
            "#c1662f",
            "#f3e7d6"
          ],
          "typography": "Fraunces for headlines with warm, high-contrast serifs; Inter for clean, legible body and product copy",
          "tone": "Warm, confident, and craft-driven without the coffee-snob jargon, welcoming to first-time home brewers",
          "layout": "Editorial hero over a roasted-bean photo, sticky buy bar, three-up product grid with tasting-note chips, and a subscription comparison block above the footer",
          "fonts": {
            "display": "Fraunces",
            "body": "Inter"
          }
        },
        "seo_geo_baseline": {
          "summary": "Optimized to rank for high-intent buying terms like 'single-origin coffee beans online', 'fresh roasted coffee subscription', and 'buy Ethiopian coffee Asheville', with Product, Offer, and Organization schema on every page so both Google and AI assistants can surface Emberwood with accurate pricing and freshness claims.",
          "schema_present": true,
          "geo_notes": [
            "Product and Offer schema expose roast date, origin, and price so AI assistants can recommend specific beans with correct, current details",
            "FAQ schema answers 'how fresh is the coffee' and 'can I cancel the subscription anytime' in the exact phrasing shoppers ask ChatGPT and Google",
            "Positioned against Trade Coffee, Atlas Coffee Club, and Counter Culture on the differentiator AI answers repeat: roasted-to-order same-day shipping with named-farm sourcing"
          ]
        },
        "conversion_notes": [
          "Sticky 'Shop this week's roast' bar and roast-date badge keep the freshness promise visible on every scroll",
          "Subscription page leads with the 15% savings and 'cancel anytime' to kill the commitment objection before checkout",
          "$18 three-origin sample flight gives first-time visitors a low-risk entry point instead of a $22 full bag",
          "Verified-review count and star rating sit directly beside the add-to-cart button as social proof at the decision point"
        ],
        "checkout_linked": true,
        "render_note": "Copy, style, page structure and SEO/GEO baseline are produced live; hosting connects at build.",
        "flags": [
          "This is a sample preview built for one scenario to show what your site could look like, not a live store."
        ],
        "sources": [
          {
            "ref": "B1",
            "quote": "60% of specialty coffee buyers cite freshness and roast date as the top factor in choosing a brand over price."
          },
          {
            "ref": "B2",
            "quote": "Subscription retention improves sharply when brands surface easy pause and cancel controls at signup rather than burying them."
          }
        ]
      }
    },
    {
      "label": "Life coach",
      "schema": "website_report",
      "result": {
        "live_url": "https://claraboone.all41.app",
        "status": "deploy_pending",
        "subdomain": "claraboone.all41.app",
        "pages": [
          {
            "type": "Home",
            "slug": "/",
            "headline": "Build the business you meant to build — without burning out to get there",
            "subhead": "1:1 and small-group coaching for founders and self-employed women who are ready to lead with clarity instead of grinding on empty.",
            "value_prop": "Clara Boone helps you turn a full calendar and a foggy plan into a focused 90-day path — so you make more, decide faster, and finally protect your evenings.",
            "proof": [
              "12 years coaching solo founders and creative-service owners; 300+ clients guided through their first hire and first $10k month",
              "Certified through the ICF (PCC) — a credential fewer than 1 in 5 practicing coaches hold",
              "Average client reports a 6-hour-a-week drop in admin time within the first month (post-program survey, 2024)"
            ],
            "cta": "Book a free 20-minute fit call",
            "cta_href": "#book",
            "has_nav": false,
            "image": "/samples/clara-hero.webp"
          },
          {
            "type": "Services",
            "slug": "/coaching",
            "headline": "1:1 coaching that moves one real decision forward every week",
            "subhead": "A private 12-week container for the season when you can't afford to guess — pricing, hiring, positioning, or the pivot you keep circling.",
            "value_prop": "Every session ends with one committed next step and a written recap, so momentum lives in your inbox — not just in the room.",
            "proof": [
              "Twelve 60-minute sessions, voice-note access between calls, and a shared decision log you keep for good",
              "Only 8 private clients on the roster at once, so your context is never a blur",
              "$3,600 for the full 12 weeks, or three payments of $1,250 — no upsell, no surprise tiers"
            ],
            "cta": "See if a 1:1 spot is open",
            "cta_href": "#book",
            "has_nav": true
          },
          {
            "type": "Program",
            "slug": "/the-steady-table",
            "headline": "The Steady Table: a 10-week group program for founders who are done doing it alone",
            "subhead": "Eight women, one cohort, and a room where your revenue goals and your real life are both allowed on the table.",
            "value_prop": "Weekly live sessions plus a private cohort thread turn isolated hustle into shared accountability — the fastest cure for the 2 a.m. spiral.",
            "proof": [
              "10 weekly 90-minute calls (Tuesdays, 12pm ET), capped at 8 members and recorded for you",
              "A working toolkit each week: pricing worksheet, offer map, weekly focus plan — yours to keep",
              "$1,450 total, or four monthly payments of $385 — roughly a third of the 1:1 investment"
            ],
            "cta": "Join the next Steady Table cohort",
            "cta_href": "#book",
            "has_nav": false
          },
          {
            "type": "About",
            "slug": "/about",
            "headline": "I spent a decade helping women grow businesses that don't cost them their lives",
            "subhead": "I'm Clara Boone — an ICF-certified coach in Asheville who left a burnout of my own before this work found me.",
            "value_prop": "I don't do vague affirmations. I bring calm, structured questions and a straight read on the numbers, so you leave each call knowing exactly what's next.",
            "proof": [
              "PCC-certified through the International Coaching Federation, with 1,400+ logged coaching hours",
              "Former agency operations lead — I've sat in the founder's chair, not just beside it",
              "Featured in Coach Foundation's 2024 roundup on sustainable solo-business growth"
            ],
            "cta": "Start with a free fit call",
            "cta_href": "#book",
            "has_nav": true,
            "image": "/samples/clara-about.webp"
          }
        ],
        "style": {
          "palette": [
            "#262420",
            "#a6785f",
            "#f4efe6"
          ],
          "typography": "Cormorant Garamond for editorial serif headlines paired with Mulish for clean, humane body text",
          "tone": "Calm, grounded, and quietly premium — warm but never breathless, closer to a good letter than a sales page",
          "layout": "Generous whitespace, a single centered column on mobile widening to an asymmetric two-column editorial grid on desktop, with soft clay dividers and a sticky booking bar",
          "fonts": {
            "display": "Cormorant Garamond",
            "body": "Mulish"
          }
        },
        "seo_geo_baseline": {
          "summary": "Optimized for 'life and business coach Asheville' and 'small group business coaching for women,' with a clear service-and-price structure that answers the exact questions buyers ask before booking a coach.",
          "schema_present": true,
          "geo_notes": [
            "LocalBusiness + Person schema names Asheville, NC and links the Google Business Profile, so map-pack and 'coach near me' searches resolve to Clara",
            "Service and Offer schema exposes the $3,600 1:1 and $1,450 group prices, which AI answer engines quote directly when asked 'how much does a business coach cost'",
            "FAQ schema captures long-tail intent ('difference between a life coach and a business coach,' 'is group coaching worth it') to earn featured-snippet and AI-overview placement"
          ]
        },
        "conversion_notes": [
          "Every page routes to one action — the free 20-minute fit call — removing the choice paralysis that kills coaching sites with five competing buttons",
          "Real prices are shown up front, which pre-qualifies leads and lifts booked-call quality by filtering out browsers before they reach the calendar",
          "Scarcity is honest and specific ('8 private clients,' 'cohort capped at 8'), so urgency reads as truth rather than pressure",
          "A sticky booking bar and repeated fit-call CTA keep the conversion point one tap away on mobile, where most coach discovery traffic lands"
        ],
        "checkout_linked": true,
        "render_note": "Copy, style, page structure and SEO/GEO baseline are produced live; hosting connects at build.",
        "flags": [
          "Sample preview built for a fictional coach to show the finished output — your real site uses your name, offers, and numbers."
        ],
        "sources": [
          {
            "ref": "B1",
            "quote": "ICF Global Coaching Study reports coaches holding a PCC or higher credential remain a minority of active practitioners worldwide."
          },
          {
            "ref": "B2",
            "quote": "Google's Search Central guidance: LocalBusiness structured data helps a service business appear for location-based and map queries."
          },
          {
            "ref": "B3",
            "quote": "BrightLocal Local Consumer Review Survey: transparent pricing and clear service pages measurably increase conversion for local service providers."
          }
        ],
        "confidence": 0.6
      }
    },
    {
      "label": "Restaurant",
      "schema": "website_report",
      "result": {
        "live_url": "https://firethorn.all41.app",
        "status": "deploy_pending",
        "subdomain": "firethorn.all41.app",
        "checkout_linked": true,
        "confidence": 0.92,
        "render_note": "Copy, style, page structure and the SEO/GEO baseline are produced live; hosting at firethorn.all41.app connects at build.",
        "flags": [
          "Sample preview — connect your data for a live, sourced run."
        ],
        "pages": [
          {
            "type": "Home",
            "slug": "/",
            "headline": "Everything Here Touches the Fire",
            "subhead": "A 38-seat hearth kitchen on Westminster Street in Providence's West End, cooking Rhode Island farms and Narragansett Bay over live oak and applewood — no gas line, no shortcuts.",
            "value_prop": "One open hearth, produce picked within 40 miles the morning we cook it, and a menu reprinted every Wednesday to match the week's harvest.",
            "proof": [
              "38 seats, one 8-foot hearth — every plate finishes over oak and applewood coals, and there's no gas range anywhere on the property.",
              "6 Rhode Island farms inside a 40-mile radius and 2 Narragansett Bay day-boats, delivered the morning we serve them.",
              "Named Best New Restaurant by Rhode Island Monthly in 2024, and booked about 3 weeks out most weekends."
            ],
            "cta": "Reserve Your Table",
            "cta_href": "#reserve",
            "has_nav": true,
            "image": "/samples/firethorn-hero.webp"
          },
          {
            "type": "Menu",
            "slug": "/menu",
            "headline": "A New Menu Every Wednesday, Cooked Only Over Coals",
            "subhead": "Reprinted every Wednesday around what the farms and the day-boats bring — ash-roasted delicata one week, a whole Narragansett black bass the next.",
            "value_prop": "Small plates built to share, a short list of hearth mains, and a Sunday family-style Hearth Supper — every dish shaped around what live coals do best.",
            "proof": [
              "Ember-roasted whole black bass for two, $46 — line-caught in Narragansett Bay, split tableside over charred Meyer lemon.",
              "Wood-grilled Rhode Island littlenecks with 'nduja butter, $18; ash-roasted beets with whipped Narragansett chèvre and burnt honey, $16.",
              "Sunday Hearth Supper: 5 family-style courses for $58 a person, one 5pm seating, 24 covers only."
            ],
            "cta": "See This Week's Menu",
            "cta_href": "#menu",
            "has_nav": true
          },
          {
            "type": "About",
            "slug": "/about",
            "headline": "Chef Nadia Ferro Brought Basque Fire Home to Narragansett Bay",
            "subhead": "From her family's stand at the Pawtuxet farmers market to two years on the grill at Asador Etxebarri, the throughline was always live flame and food grown close to home.",
            "value_prop": "Firethorn is Nadia's love letter to Rhode Island — the bay she grew up on, the farmers she buys from by name, and the hearth she laid brick by brick.",
            "proof": [
              "16 years on the line, including 2 years on the wood grill at Asador Etxebarri, long ranked among the World's 50 Best Restaurants.",
              "Built Firethorn's 8-foot masonry hearth by hand with a Providence mason over the winter of 2023.",
              "Sources by name from 6 farms and 2 Narragansett Bay day-boat fishermen she's known since her Cranston childhood."
            ],
            "cta": "Read the Full Story",
            "cta_href": "#story",
            "has_nav": true,
            "image": "/samples/firethorn-about.webp"
          },
          {
            "type": "Gallery",
            "slug": "/gallery",
            "headline": "The Hearth at Golden Hour, and the Plates It Chars",
            "subhead": "The 8-foot fire at dusk, black char on a grilled cabbage, copper light pooling on reclaimed-oak tables — Firethorn, in pictures.",
            "value_prop": "A low-lit 38-seat room framed in reclaimed New England oak and blackened steel, where every seat holds a clear line to the fire.",
            "proof": [
              "47 photographs of the room, the hearth and 20+ seasonal dishes, shot on film by Providence photographer Elena Marsh.",
              "The hearth burns roughly 3 cords of local oak and applewood a month, split and stacked in view of the dining room.",
              "6 counter stools at the fire's edge are the best seats in the house — they book first, every single night."
            ],
            "cta": "Book a Seat at the Fire",
            "cta_href": "#reserve",
            "has_nav": true
          },
          {
            "type": "Reserve",
            "slug": "/reserve",
            "headline": "Reserve a Seat by the Fire in Under a Minute",
            "subhead": "Live availability, instant confirmation and a same-day text reminder — Wednesday through Sunday, 5 to 10pm, at 512 Westminster Street.",
            "value_prop": "Book a hearth-counter stool, a table for two, or the full 14-seat back room for a private Hearth Supper — all in a few taps.",
            "proof": [
              "Instant confirmation and a same-day text reminder — no phone tag; each night's tables release 30 days out at 9am sharp.",
              "6 hearth-counter stools and a 14-seat private room book online; parties of 7 or more are confirmed by our team within 24 hours.",
              "Open Wed–Sun, 5–10pm; a 24-hour cancellation window keeps your card uncharged, with a $25-a-seat no-show fee after."
            ],
            "cta": "Check Live Availability",
            "cta_href": "#reserve",
            "has_nav": true
          }
        ],
        "style": {
          "palette": [
            "#1F140E",
            "#C34A26",
            "#F3E9D7"
          ],
          "typography": "Display headlines in a high-contrast serif with Canela/Ogg character; body in a clean humanist sans (Söhne, Founders Grotesk); menu dishes and prices set in tabular monospace so every plate and dollar figure aligns down the column.",
          "tone": "Warm, confident and sensory — smoke, char, season and salt air — plainspoken about the craft and never precious about it.",
          "layout": "Full-bleed hero of the hearth at dusk under a sticky charcoal top nav; alternating full-width image/text bands down the page; menu rendered as a live-updating two-column typographic list; reservation module pinned to a right rail on desktop and a sticky bottom bar on mobile."
        },
        "seo_geo_baseline": {
          "summary": "Targets high-intent local searches — 'wood-fired restaurant Providence,' 'best new restaurant West End Providence,' 'live-fire dinner Rhode Island,' 'farm-to-table Providence reservations' and 'private dining Westminster Street' — plus dish-level intents like 'whole grilled black bass Providence' and 'Sunday family-style supper Providence.'",
          "schema_present": true,
          "geo_notes": [
            "Restaurant and LocalBusiness JSON-LD carry geo coordinates, openingHours (Wed–Sun 17:00–22:00), priceRange $$$ and acceptsReservations=true, with Menu schema marking up each dish and price so the live weekly menu can surface directly in results.",
            "Neighborhood-scoped headings for 'West End Providence' and 'Westminster Street' capture low-competition long-tail queries that the generic 'Providence restaurant' term buries.",
            "FAQPage schema answers plain-language questions — 'Is Firethorn entirely wood-fired?', 'Does Firethorn take reservations?', 'What's on this week's menu?' — formatted for citation in ChatGPT, Perplexity and Google AI Overviews."
          ]
        },
        "conversion_notes": [
          "The Reserve CTA rides every page and collapses into a sticky bottom bar on mobile, so a hearth-counter stool is never more than one thumb-tap away.",
          "Live availability is embedded in-page instead of a dead-end 'call us,' so a guest who decides at 10pm can hold a Friday table before the feeling passes — no waiting for the line to open.",
          "Named, checkable proof — 38 seats, 40-mile sourcing, an Etxebarri pedigree, 'booked 3 weeks out' — stacks trust and scarcity in one glance and nudges the guest to reserve now, not 'sometime.'",
          "The Wednesday menu page is crawlable and worth revisiting, so it doubles as fresh SEO fuel and a standing reason regulars return — and every return re-exposes them to the Reserve CTA."
        ],
        "sources": [
          {
            "ref": "B1",
            "quote": "Restaurants that accept online reservations seat roughly 27% more covers than phone-only peers."
          },
          {
            "ref": "B2",
            "quote": "73% of diners visit a restaurant's website before booking, and most decide within 90 seconds of landing."
          }
        ]
      }
    },
    {
      "label": "Fitness studio",
      "schema": "website_report",
      "result": {
        "live_url": "https://forgeandfern.all41.app",
        "status": "deploy_pending",
        "subdomain": "forgeandfern.all41.app",
        "checkout_linked": true,
        "confidence": 0.94,
        "render_note": "Copy, style, page structure and the SEO/GEO baseline are generated live; hosting at forgeandfern.all41.app connects at build.",
        "flags": [
          "Sample preview — connect your data for a live, sourced run."
        ],
        "pages": [
          {
            "type": "Home",
            "slug": "/",
            "headline": "Barbell-strong and yoga-supple — on four hours a week.",
            "subhead": "Forge & Fern is Denver's strength-and-yoga studio inside a restored 1926 RiNo iron foundry, pairing a 50-minute tempo lift with a 60-minute breath-led flow in the same training week.",
            "value_prop": "Most gyms make you choose between getting strong and staying mobile; the Forge Method programs both in one weekly rhythm, so you add muscle without trading away your range.",
            "proof": [
              "16-person class cap and a 1:8 coach-to-lifter ratio — never a wait for a squat rack",
              "4.9 stars across 380+ Google reviews since we opened on Larimer Street in 2019",
              "New here? Two weeks of unlimited classes for $59"
            ],
            "cta": "Claim your $59 intro",
            "cta_href": "#join",
            "has_nav": true,
            "image": "/samples/forgefern-hero.webp"
          },
          {
            "type": "Classes",
            "slug": "/classes",
            "headline": "Three formats, one outcome: strong under the bar, supple on the mat.",
            "subhead": "Heavy compound strength, 95°F power yoga, and our 75-minute hybrid — every session capped at 16 and coached by name, never by screen.",
            "value_prop": "Whether you want 40 pounds on your deadlift or to finally sit in a full squat, every session is coached live and scaled to you — no pre-recorded video, no autopilot.",
            "proof": [
              "Drop-in $36 · 8-class pack $256 ($32/class) · Forge Unlimited $229/mo, no contract",
              "The Full Forge — our 75-minute flagship: a heavy strength block, then a grounding flow, in one session",
              "Ember runs 95°F power yoga; The Anvil pairs barbell compounds with kettlebells in 45 minutes"
            ],
            "cta": "See the full schedule",
            "cta_href": "#book",
            "has_nav": true
          },
          {
            "type": "About",
            "slug": "/about",
            "headline": "Two surgeons said she'd never lift again. She built a studio instead.",
            "subhead": "Founder Sena Okafor rowed lightweight double sculls for a national team until an L4–L5 disc herniation ended her racing at 29 — then rebuilt her spine with the exact load-then-mobilize method Forge & Fern teaches today.",
            "value_prop": "The Forge Method isn't strength bolted onto yoga; it's one system — load the joint, then mobilize it — that Sena reverse-engineered across 18 months of her own rehab and 12 years of coaching since.",
            "proof": [
              "Sena is a CSCS-certified strength coach and an RYT-500 registered yoga teacher",
              "Every floor coach holds a strength cert plus 200+ hours of yoga training — a hiring bar held since 2019",
              "3,800 sq ft inside a 1926 iron foundry, the original cast-iron beams left exposed"
            ],
            "cta": "Meet the coaching team",
            "cta_href": "#book",
            "has_nav": true,
            "image": "/samples/forgefern-about.webp"
          },
          {
            "type": "Results",
            "slug": "/results",
            "headline": "Heavier lifts, deeper breaths, and a 4.9 that 380 people meant.",
            "subhead": "From a first-ever bodyweight deadlift to a backbend a decade in the making — this is what happens when strength and mobility are finally trained together.",
            "value_prop": "We log load and range for every member, so progress here is measured in pounds lifted and inches gained — not vibes or flattering before-after lighting.",
            "proof": [
              "Members add an average 38% to their deadlift 1RM in their first 16-week cycle",
              "'First time in my life I can deadlift my bodyweight and sit in a full squat.' — Priya M., member since 2021",
              "89% six-month retention · 4.9★ across 380+ reviews · 'Best Boutique Studio,' 5280 Magazine 2023"
            ],
            "cta": "Read all 380 reviews",
            "cta_href": "#book",
            "has_nav": true
          },
          {
            "type": "Join",
            "slug": "/join",
            "headline": "Start with two weeks. Decide with your body.",
            "subhead": "Grab the $59 intro, book your first class in under 90 seconds, and let a coach map your first four weeks on day one.",
            "value_prop": "No contracts, no initiation fee, freeze or cancel anytime — we'd rather earn your month 13 than trap you in month 2.",
            "proof": [
              "$59 for two weeks of unlimited classes — every format, no restrictions",
              "Book instantly online; open 5:30am–9pm weekdays, 7am–2pm weekends",
              "Your first class includes a free 15-minute movement screen with your coach"
            ],
            "cta": "Book my first class",
            "cta_href": "#book",
            "has_nav": true
          }
        ],
        "style": {
          "palette": [
            "#22201C",
            "#C85A34",
            "#F3ECDF"
          ],
          "typography": "Display headlines in a high-contrast condensed serif (Canela / Ogg register) that reads forged and editorial; body in a clean neutral grotesque (Söhne / Neue Haas) at a generous 1.6 line-height; class names and prices set in small-caps, tracked mono labels.",
          "tone": "Grounded, confident, quietly premium — coach-in-your-corner directness with none of the shouty bootcamp energy; every sentence earns trust by naming a specific.",
          "layout": "Full-bleed foundry hero with a slow-motion lift-into-flow reel; sticky top nav carrying a persistent ember 'Claim $59 intro' button; asymmetric editorial grids on warm cream; a live-times schedule block; a three-tier pricing table with per-class math; and a member testimonial wall above the Join CTA."
        },
        "seo_geo_baseline": {
          "summary": "Targets high-intent local search — 'strength and yoga studio Denver,' 'boutique gym RiNo,' 'deadlift coaching Denver,' 'heated power yoga near me,' 'strength training for runners Denver' — plus trial-shopper queries like 'gym free trial Denver RiNo' and 'best boutique fitness studio Denver.'",
          "schema_present": true,
          "geo_notes": [
            "LocalBusiness + HealthClub schema carries geo-coordinates, opening hours (Mon–Fri 5:30am–9pm, Sat–Sun 7am–2pm) and priceRange ($$), so the studio surfaces in Google's Map Pack and 'near me' results across RiNo.",
            "Each class is marked up as a Service with an Offer (Drop-in $36, Forge Unlimited $229/mo), letting long-tail pages rank for 'The Full Forge Denver' and 'heated yoga RiNo pricing.'",
            "FAQPage, Review and AggregateRating schema plus plain-language answer blocks ('Is Forge & Fern good for beginners?') give AI assistants clean, citable facts, so ChatGPT, Perplexity and Google AI Overviews name the studio for 'strength and yoga in Denver.'"
          ]
        },
        "conversion_notes": [
          "The $59 two-week intro rides in the sticky nav on every page, so the low-risk trial is always one tap away and reframes the decision as a test drive, not a contract.",
          "Every proof point carries a hard number — 16-person cap, 4.9★, 38% deadlift gain — pre-empting the two biggest boutique objections: crowding and 'will it actually work.'",
          "Pricing is shown openly with the per-class math spelled out ($256 = $32/class), killing the hidden-cost anxiety that bounces premium shoppers to a competitor.",
          "The Results page opens with tracked metrics and a named member quote, landing believable social proof right before the Join CTA that sits in the persistent nav."
        ],
        "sources": [
          {
            "ref": "B1",
            "quote": "Studios leading with a low-cost intro trial convert first-timers at roughly 3x the rate of contract-first gyms. — IHRSA Boutique Studio Report"
          },
          {
            "ref": "B2",
            "quote": "Pairing resistance training with dedicated mobility work improves functional strength outcomes by up to 30%. — ACSM's Health & Fitness Journal"
          }
        ]
      }
    }
  ],
  "content-pipeline": [
    {
      "label": "Free-plan story",
      "schema": "content_report",
      "result": {
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
      }
    },
    {
      "label": "Fitness coach",
      "schema": "content_report",
      "result": {
        "summary": "One idea — 'Why counting calories failed me' — expanded into a full week of on-brand content for fitness coach Marcus Reyes: a flagship article, four fully-written native repurposes (LinkedIn, X thread, Newsletter, Instagram), and a Monday-through-Friday posting schedule.",
        "core": {
          "title_options": [
            "Why Counting Calories Failed Me — And What Actually Worked",
            "I Tracked 1,400 Calories a Day for 8 Months. Here's Why I Quit.",
            "The Calorie App Gave Me a Number. It Couldn't Give Me a Body I'd Keep."
          ],
          "body": "For eight months I logged every bite in MyFitnessPal. 1,400 calories a day, weighed on a $12 kitchen scale, checked three times before I ate. I lost 19 pounds. Then I gained back 24.\n\nThe problem was never the math — it was that the math owned me. I skipped my sister's birthday dinner because I'd \"used up\" my day by 6pm. I ate 200-calorie protein bars I hated instead of real food I'd actually repeat. When I traveled and couldn't log, I binged, because the system only had two settings: perfect or off.\n\nWhat finally worked was boring. I built three non-negotiable habits instead of one spreadsheet: 30g of protein at breakfast, a 10-minute walk after every meal, and lights out by 10:30. No app. No weighing.\n\nEighteen months later I'm down 27 pounds and I've held it — because I stopped managing numbers and started managing behaviors I could do on my worst day. Calories count. But habits are what you keep.",
          "takeaway": "You don't need a perfect number — you need three habits you can repeat on your worst day."
        },
        "repurposes": [
          {
            "channel": "LinkedIn",
            "content": "I lost 19 pounds counting calories.\n\nThen I gained back 24.\n\nFor 8 months I logged every bite in MyFitnessPal — 1,400 a day, weighed on a kitchen scale, checked three times before I ate.\n\nHere's what nobody tells you about tracking: it doesn't fail because the math is wrong. It fails because the math starts running your life.\n\nI skipped my sister's birthday dinner because I'd \"used up\" my calories by 6pm. I ate protein bars I hated instead of meals I'd actually repeat. One missed travel day turned into a binge — because the system only had two settings: perfect, or off.\n\nWhat finally worked was almost embarrassingly boring:\n\n→ 30g protein at breakfast\n→ A 10-minute walk after every meal\n→ Lights out by 10:30\n\nNo app. No scale. Just three things I could do on my worst day.\n\n18 months later: down 27 pounds, and holding.\n\nThe shift wasn't discipline. It was design. I stopped managing numbers and started managing behaviors.\n\nIf tracking has ever made you feel like a failure — it's not you. It's the tool asking for perfection you were never built to sustain.\n\nWhat's one habit you've actually kept? 👇",
            "hook_options": [
              "I lost 19 pounds counting calories. Then I gained back 24.",
              "For 8 months, a calorie app ran my life. Here's why I finally deleted it."
            ]
          },
          {
            "channel": "X",
            "content": "I counted calories for 8 months.\n\nLost 19 lbs. Gained back 24.\n\nHere's why tracking failed me — and the 3 boring habits that actually worked 🧵\n\n1/\n\n1,400 calories a day. Weighed everything on a kitchen scale. Checked the app 3x before every meal.\n\nIt worked… until it owned me.\n\n2/\n\nThe real problem wasn't the math.\n\nIt was that the app had two settings: perfect, or off.\n\nMiss a day traveling? Binge. Hit 6pm \"out of calories\"? Skip dinner with family.\n\n3/\n\nI ate 200-cal protein bars I hated instead of real meals I'd actually repeat.\n\nI was optimizing a number, not building a life.\n\n4/\n\nSo I threw out the app and picked 3 habits I could do on my WORST day:\n\n• 30g protein at breakfast\n• 10-min walk after every meal\n• Lights out by 10:30\n\n5/\n\nNo weighing. No logging. No math.\n\n18 months later: down 27 lbs and holding.\n\n6/\n\nCalories count. But habits are what you keep.\n\nStop managing numbers. Start managing behaviors you can repeat.\n\nThat's the whole game.\n\n7/\n\nIf this helped, follow @CoachMarcusR — I break down sustainable fat loss for busy people every week. No gimmicks.",
            "hook_options": [
              "I counted calories for 8 months. Lost 19 lbs. Gained back 24. Here's why tracking failed me 🧵",
              "The calorie app gave me a number. It couldn't give me a body I'd keep. A thread on what actually worked 🧵"
            ]
          },
          {
            "channel": "Newsletter",
            "content": "Subject: The day I skipped my sister's birthday dinner\n\nHi friend,\n\nI want to tell you about the moment I knew calorie counting had gone too far.\n\nIt was my sister's birthday. Steakhouse. And I sat there ordering a side salad because MyFitnessPal said I'd \"used up\" my 1,400 calories by 6pm.\n\nEight months of that. I lost 19 pounds. Then life happened — a work trip, a week I couldn't log — and I gained back 24.\n\nHere's the lesson I wish someone had handed me sooner: tracking doesn't fail because you lack willpower. It fails because it only has two settings — perfect or off. And nobody stays perfect.\n\nWhat finally worked was boring on purpose. I replaced one spreadsheet with three habits I could do on my worst day:\n\n1. 30g of protein at breakfast (eggs, Greek yogurt, a shake — your call)\n2. A 10-minute walk after every meal\n3. Lights out by 10:30\n\nNo app. No scale. Eighteen months later I'm down 27 pounds and holding.\n\nThis week's challenge: pick ONE of those three. Just one. Do it every day until Sunday and hit reply to tell me how it went — I read every response.\n\nTo habits you can keep,\nMarcus\n\nP.S. If you want help building your three, my 1:1 coaching has two spots open this month. Reply 'IN' and I'll send details.",
            "hook_options": [
              "Subject: The day I skipped my sister's birthday dinner",
              "Subject: I lost 19 lbs, then gained back 24 — here's what I changed"
            ]
          },
          {
            "channel": "Instagram",
            "content": "I weighed my food on a $12 scale for 8 months. 😮‍💨\n\nLost 19 lbs. Gained back 24.\n\nSwipe-worthy truth: calorie counting didn't fail because I was lazy. It failed because it demanded PERFECT — and one missed day sent the whole thing crashing.\n\nHere's what actually stuck (save this 📌):\n\n✅ 30g protein at breakfast\n✅ 10-min walk after every meal\n✅ Lights out by 10:30\n\nNo app. No math. Just 3 things I could do on my worst day.\n\n18 months later → down 27 lbs and holding. 🙌\n\nCalories count. But HABITS are what you keep.\n\nWhich of the 3 are you starting with? Drop a 1, 2, or 3 below 👇\n\n.\n.\n.\n#sustainablefatloss #caloriecounting #habitsnotdiets #fitnesscoach #fatlossjourney #protein #walkingworkout #nonscalevictory #healthyhabits #fitover30",
            "hook_options": [
              "I weighed my food on a $12 scale for 8 months. Here's why I stopped.",
              "Lost 19 lbs. Gained back 24. The problem wasn't willpower 👇"
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
            "channel": "Newsletter",
            "when": "Tuesday",
            "piece_ref": "newsletter"
          },
          {
            "channel": "X",
            "when": "Wednesday",
            "piece_ref": "x"
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
          "This is a sample preview generated to show the format — swap in your own story and numbers before publishing."
        ],
        "sources": [
          {
            "ref": "R1",
            "quote": "A 2018 JAMA study (Gardner et al., DIETFITS) found no significant weight-loss difference between calorie-focused low-fat and low-carb diets over 12 months — adherence, not the number, predicted results."
          },
          {
            "ref": "R2",
            "quote": "CDC guidance notes that people who lose weight gradually through sustained behavior change (about 1–2 lbs/week) are more likely to keep it off than those relying on restrictive short-term tracking."
          }
        ],
        "confidence": 0.6
      }
    },
    {
      "label": "SaaS launch",
      "schema": "content_report",
      "result": {
        "summary": "One founder retro — 'We shipped the feature customers begged for' — turned into a full launch week for Relay (B2B support inbox SaaS): a flagship article, four native channel rewrites, and a Monday-to-Friday posting schedule, all in Maya Chen's honest founder voice.",
        "core": {
          "title_options": [
            "We shipped the feature customers begged for — here's what we learned",
            "It took 9 weeks, not 2: the real story behind Relay for Slack",
            "We were wrong about our own feature. The beta saved us."
          ],
          "body": "For 18 months, one request dominated our roadmap board: *\"Let us reply to tickets from Slack.\"* We kept saying \"soon.\" Last quarter, we finally shipped Relay for Slack.\n\nI want to be honest about what actually happened.\n\nWe scoped it at two weeks. It took nine. The hard part wasn't the Slack API — it was threading. A support conversation isn't one message; it's a thread with context, attachments, and status. Mapping that into Slack's model broke three times before it clicked.\n\nWe ran a closed beta with 38 teams before launch. That saved us. Two features we were *sure* were essential went unused. One throwaway feature — reply drafts — became the thing people loved.\n\nThe result: 71% of beta teams activated within seven days. Median first-response time dropped 34%. One customer, a 12-person agency, told us they now close tickets during standup.\n\nThe lesson I keep relearning: ship the smallest honest version, put it in real hands early, and let them tell you what actually matters. Every time I skip that step, I pay for it in weeks.",
          "takeaway": "Ship the smallest honest version, get it into real hands early, and let customers tell you which features actually matter."
        },
        "repurposes": [
          {
            "channel": "LinkedIn",
            "content": "We scoped it at 2 weeks. It took 9.\n\nFor 18 months, customers asked for one thing: reply to support tickets straight from Slack. We finally shipped Relay for Slack last quarter — and I want to be honest about what building it actually taught us.\n\nThe Slack API wasn't the hard part. Threading was. A support conversation isn't a single message — it's context, attachments, and status. It broke three times before it clicked.\n\nWhat saved us: a closed beta with 38 teams before launch.\n\n→ Two features we were certain were essential? Unused.\n→ One throwaway feature — reply drafts — became the thing people loved.\n→ 71% of beta teams activated within 7 days.\n→ Median first-response time dropped 34%.\n\nThe lesson I keep relearning: ship the smallest honest version, put it in real hands early, and let customers tell you what actually matters.\n\nEvery time I skip that step, I pay for it in weeks.\n\nWhat's a feature your team was sure about — that users ignored?",
            "hook_options": [
              "We scoped it at 2 weeks. It took 9.",
              "For 18 months, customers begged us for one feature. We were wrong about half of it."
            ]
          },
          {
            "channel": "X",
            "content": "1/ We shipped the feature customers begged us for for 18 months.\n\nRelay for Slack: reply to support tickets without leaving Slack.\n\nHere's what building it actually taught us 🧵\n\n2/ We scoped it at 2 weeks.\n\nIt took 9.\n\nThe Slack API wasn't the problem. Threading was.\n\n3/ A support conversation isn't one message. It's a thread — context, attachments, status.\n\nMapping that into Slack's model broke 3 times before it clicked.\n\n4/ The thing that saved us: a closed beta with 38 teams BEFORE launch.\n\n5/ Two features we were 100% sure were essential?\n\nUnused.\n\nOne throwaway feature — reply drafts — became the thing people loved most.\n\n6/ The numbers after launch:\n\n• 71% of beta teams activated in 7 days\n• Median first-response time down 34%\n• One 12-person agency now closes tickets during standup\n\n7/ The lesson I keep relearning:\n\nShip the smallest honest version. Put it in real hands early. Let customers tell you what actually matters.\n\nEvery time I skip that step, I pay for it in weeks.",
            "hook_options": [
              "We scoped it at 2 weeks. It took 9. A thread on being wrong about your own feature 🧵",
              "The feature customers begged us for for 18 months taught me I don't know my own product. 🧵"
            ]
          },
          {
            "channel": "Newsletter",
            "content": "Subject: We shipped it. Here's the messy version.\n\nHi —\n\nMaya here. Quick, honest note from the Relay team.\n\nFor 18 months, one request dominated our roadmap: let people reply to support tickets directly from Slack. We kept saying \"soon.\" Last quarter, we finally shipped Relay for Slack. It's live for every team on a paid plan today.\n\nBut the launch post is the clean story. Here's the real one.\n\nWe scoped the build at two weeks. It took nine. The Slack API was straightforward — threading wasn't. A support conversation carries context, attachments, and status, and folding all of that into Slack's model broke three separate times before it held together.\n\nWhat kept us from shipping the wrong thing was a closed beta with 38 teams. Two features we were certain mattered went completely unused. A feature we almost cut — reply drafts — became the one people mention most.\n\nThe results so far:\n• 71% of beta teams activated within 7 days\n• Median first-response time down 34%\n• One 12-person agency now clears tickets during their morning standup\n\nIf you've been waiting on this, it's ready. Reply to this email and tell me what breaks — I read every one.\n\n— Maya\nCo-founder, Relay\n\nP.S. If your team lives in Slack, turn it on under Settings → Integrations. Takes about 90 seconds.",
            "hook_options": [
              "Subject: We shipped it. Here's the messy version.",
              "Subject: The feature you asked for 87 times is live (and I was wrong about it)"
            ]
          },
          {
            "channel": "Instagram",
            "content": "We scoped it at 2 weeks. It took 9. 😅\n\nAfter 18 months of customers asking, Relay for Slack is finally live — reply to support tickets without ever leaving Slack.\n\nThe honest version of building it:\n→ Threading, not the API, was the hard part (it broke 3x)\n→ A closed beta with 38 teams saved us from shipping the wrong thing\n→ Two \"essential\" features went unused\n→ The feature we almost cut became everyone's favorite\n\nThe payoff: 71% of beta teams activated in a week, and first-response times dropped 34%.\n\nThe lesson we keep relearning → ship the smallest honest version, get it in real hands early, and let customers tell you what actually matters.\n\nBuilding in public, mistakes included. Follow along. 👇\n\n#buildinpublic #saas #startups #founderlife #customersupport #productmanagement #slack #b2bsaas",
            "hook_options": [
              "We scoped it at 2 weeks. It took 9. 😅",
              "We were wrong about our own feature. The beta caught it just in time. 👇"
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
          "This is a sample preview generated from one example idea — swap in your real product, metrics, and voice before publishing."
        ],
        "sources": [
          {
            "ref": "R1",
            "quote": "Relay closed beta, 38 teams: 71% activated within 7 days."
          },
          {
            "ref": "R2",
            "quote": "Beta cohort telemetry: median first-response time fell 34%."
          },
          {
            "ref": "R3",
            "quote": "First Round Review: put a rough version in real hands early."
          }
        ],
        "confidence": 0.6
      }
    }
  ],
  "competitor-intelligence": [
    {
      "label": "PM SaaS",
      "schema": "competitor_report",
      "result": {
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
      }
    },
    {
      "label": "Coffee subscription",
      "schema": "competitor_report",
      "result": {
        "summary": "This week the specialty-coffee subscription space moved on price and retention, not product. Roast Republic cut its entry tier to $16/bag and launched an annual prepay discount, Craft & Kettle poached a Head of Lifecycle from Blue Bottle and pushed a 'skip, don't cancel' flow, and Origin Club raised $6M to fund a single-origin scaling play. The through-line: rivals are protecting subscriber LTV and lowering the barrier to first order. If you compete on price alone you lose to Roast Republic; the opening is roast freshness proof and flexible cadence, which none of the three do well.",
        "baseline": false,
        "changes": [
          {
            "competitor": "Roast Republic",
            "signal": "pricing",
            "what_changed": "Dropped the 'Weekday Roast' entry subscription from $19 to $16 per 12oz bag and added an annual prepay option at $168/yr (equivalent to $14/bag, ~26% off month-to-month). Homepage hero and checkout both now lead with the $16 price and a '2 bags free on annual' banner.",
            "significance": "high",
            "why_it_matters": "This resets the anchor price in the category and directly undercuts your $18 entry tier. Price-sensitive first-time buyers comparing you side-by-side will now see a $2/bag gap plus a free-bag incentive. Expect elevated churn at renewal and higher CAC on branded-comparison search terms unless you respond with either a matched entry offer or a clearly differentiated value story."
          },
          {
            "competitor": "Craft & Kettle",
            "signal": "hiring",
            "what_changed": "Hired Marisol Devane as Head of Lifecycle Marketing (ex-Blue Bottle, started Sept 8 per LinkedIn) and, within the same week, shipped a redesigned account page that replaces the 'Cancel' button with a 'Pause or skip your next box' flow offering 1-2-3 month skips and a one-click flavor swap.",
            "significance": "high",
            "why_it_matters": "A dedicated lifecycle hire plus a retention-focused cancel flow signals they are going hard at churn, historically their weakest metric. Their save-flow now beats yours, where cancel is still a single click. This is the change most likely to quietly compound: every skip they capture instead of a cancel is LTV you were counting on winning back."
          },
          {
            "competitor": "Origin Club",
            "signal": "funding",
            "what_changed": "Announced a $6M seed extension led by Wildeye Ventures (TechCrunch, Sept 10), earmarked for direct farm partnerships and a new 'Origin Passport' feature that ties each bag to a named producer, lot, and harvest date via QR.",
            "significance": "medium",
            "why_it_matters": "Origin Club is buying its way into the traceability/provenance narrative you've partly owned. The capital funds supply-chain depth you can't match on price, but the 'Origin Passport' is a marketing artifact you can out-execute faster than they can build farm relationships. Move now while it's still an announcement, not a shipped feature."
          },
          {
            "competitor": "Roast Republic",
            "signal": "marketing",
            "what_changed": "Launched a paid TikTok/Meta creator push around a '#30SecondPourover' UGC series (12+ creator videos live since Sept 9) and added a landing page at roastrepublic.com/pourover with a bundled starter kit (dripper + 4 bags) at $39.",
            "significance": "medium",
            "why_it_matters": "They're pairing the price cut with a low-friction, gift-able entry product aimed at pour-over beginners, the exact top-of-funnel segment you rely on for organic growth. The bundle also raises AOV on first order, softening the margin hit from their $16 price. Watch whether this pushes your creator CPMs up on shared audiences."
          }
        ],
        "intel": [
          {
            "competitor": "Roast Republic",
            "meaning": "They are prioritizing subscriber acquisition volume and prepaid cash over near-term per-bag margin, and reinforcing it with a beginner-focused funnel.",
            "likely_reason": "Likely raising or prepping for a raise and optimizing for subscriber count and locked-in annual revenue as headline metrics; the bundle and annual prepay both pull cash forward.",
            "threat_or_opportunity": "Threat to your entry-tier acquisition. Opportunity: they've conceded the premium/freshness high ground, that's where you win margin."
          },
          {
            "competitor": "Craft & Kettle",
            "meaning": "Retention, not acquisition, is now their strategic focus, and they've staffed and shipped against it in the same week.",
            "likely_reason": "Their churn has likely been the number holding back unit economics; a senior lifecycle hire from Blue Bottle is a deliberate bet on fixing LTV before scaling spend.",
            "threat_or_opportunity": "Threat: their save flow now outperforms yours and will erode your win-back assumptions. Opportunity: they'll be inward-focused on lifecycle for 1-2 quarters, leaving acquisition channels softer."
          },
          {
            "competitor": "Origin Club",
            "meaning": "They're moving upmarket into provenance and single-origin depth, funded rather than bootstrapped.",
            "likely_reason": "New capital needs a differentiated story for the next raise; traceability is defensible and press-friendly, and farm partnerships are a moat competitors can't quickly copy.",
            "threat_or_opportunity": "Opportunity in the short term: the feature isn't shipped, so you can own 'freshness + traceability' messaging first. Threat long-term if their farm relationships mature."
          }
        ],
        "battlecards": [
          {
            "competitor": "Roast Republic",
            "strengths": [
              "Lowest entry price in the category at $16/bag and an aggressive $168 annual prepay",
              "Strong beginner funnel: pour-over bundle at $39 plus active creator UGC engine",
              "High brand awareness on branded-comparison and 'best coffee subscription' search terms"
            ],
            "weaknesses": [
              "Price-led positioning trains customers to leave for the next discount, weak loyalty",
              "No roast-date transparency; bags ship from a central warehouse with variable freshness",
              "Thin origin/traceability story, all value is 'cheap and convenient'"
            ],
            "pricing": "Entry $16/12oz bag month-to-month; annual prepay $168/yr (~$14/bag); pour-over starter bundle $39",
            "positioning": "Great everyday coffee, delivered cheap and easy, the mass-accessible on-ramp to specialty subscriptions",
            "how_to_win": [
              "Lead every comparison with roast-date-stamped freshness ('roasted-to-order, shipped within 48 hours') that they structurally can't match from central fulfillment",
              "Introduce a lower-commitment trial (single bag, no subscription) to neutralize their price anchor without gutting your subscription margin",
              "Target their discount-acquired subscribers at month 2-3 with a 'tastes stale yet?' freshness-guarantee retargeting angle"
            ]
          },
          {
            "competitor": "Craft & Kettle",
            "strengths": [
              "Now the strongest retention/save flow in the set: pause, 1-2-3 month skip, one-click flavor swap",
              "Senior lifecycle leadership (ex-Blue Bottle) driving disciplined LTV work",
              "Polished, flexible account experience that reduces cancel friction"
            ],
            "weaknesses": [
              "Currently inward-focused on lifecycle, likely under-investing in top-of-funnel acquisition",
              "Middle-of-market positioning with no sharp differentiator on price or provenance",
              "New retention motion is unproven; execution risk while the new hire ramps"
            ],
            "pricing": "Entry $18/bag; no public annual prepay discount as of this week",
            "positioning": "The dependable, flexible specialty subscription, 'coffee that fits your schedule'",
            "how_to_win": [
              "Match their flexibility fast: ship a pause/skip flow of your own within 2-3 weeks so 'flexible cadence' stops being their edge",
              "Attack acquisition channels while they're heads-down on retention, increase creator and branded-search spend now",
              "Differentiate on cadence intelligence, offer smart auto-adjust based on consumption rather than manual skips they require the customer to manage"
            ]
          }
        ],
        "trends": [
          "Retention is the new battleground: two of three rivals invested in reducing churn (Craft & Kettle's save flow, Roast Republic's annual prepay lock-in) rather than pure acquisition, signaling the category is maturing past land-grab.",
          "Provenance and traceability are moving from nice-to-have to funded roadmap (Origin Club's 'Origin Passport'), so a credible freshness-plus-origin story is becoming table stakes for premium positioning.",
          "Beginner-focused, gift-able entry products (Roast Republic's $39 pour-over bundle) are emerging as the preferred top-of-funnel vehicle, replacing straight discount subscriptions as the low-friction first purchase."
        ],
        "filtered_noise_count": 5,
        "flags": [
          "Sample preview: this report uses illustrative figures for three example competitors to show the format and depth you'd get on your real watchlist."
        ],
        "sources": [
          {
            "ref": "C1",
            "quote": "Origin Club raises $6M seed extension led by Wildeye Ventures to fund direct farm partnerships and its new Origin Passport traceability feature."
          },
          {
            "ref": "C2",
            "quote": "Roast Republic checkout, Sept 12: 'Weekday Roast from $16/bag — go annual and get 2 bags free ($168/yr).'"
          },
          {
            "ref": "C3",
            "quote": "Craft & Kettle account page, Sept 11: 'Need a break? Pause or skip your next box — 1, 2, or 3 months' (replaces prior Cancel button)."
          }
        ],
        "confidence": 0.78
      }
    },
    {
      "label": "CRM SaaS",
      "schema": "competitor_report",
      "result": {
        "summary": "This week's headline: Cadence CRM launched native AI call summarization and quietly cut its Starter tier from $29 to $19/seat/mo — a clear move down-market to defend against Pipeline HQ's PLG surge. Pipeline HQ shipped a two-way HubSpot sync and posted 7 new AEs on LinkedIn (a 30% GTM headcount jump), signaling an enterprise push. Relayo raised a $14M Series A led by Bessemer and reframed its site around 'revenue automation,' abandoning the pure-CRM category. Net: pricing pressure is coming from below (Cadence) and category redefinition from the side (Relayo). Your response window is roughly 2-3 weeks before Cadence's new pricing hits their comparison pages and review-site profiles.",
        "baseline": false,
        "changes": [
          {
            "competitor": "Cadence CRM",
            "signal": "pricing",
            "what_changed": "Dropped Starter plan from $29 to $19/seat/mo and rebundled AI Call Summaries (previously a $12/seat add-on) into Growth and above at no extra cost. Annual commitment discount widened from 15% to 20%.",
            "significance": "high",
            "why_it_matters": "This resets the entry-price anchor for SMB buyers evaluating you side-by-side, and it neutralizes AI summarization as a paid differentiator. Any deal where you're quoting $25+/seat is now exposed on the first pricing screen. Expect this to show up in G2 comparison traffic within 10-14 days."
          },
          {
            "competitor": "Pipeline HQ",
            "signal": "product",
            "what_changed": "Shipped a bidirectional HubSpot sync (contacts, deals, activity) on Sept 9, replacing their one-way import. Announced via changelog and a Product Hunt launch that hit #3 Product of the Day with 640+ upvotes.",
            "significance": "high",
            "why_it_matters": "This removes the #1 stated reason your mutual prospects stayed with you — 'Pipeline HQ can't keep our HubSpot data in sync.' Deals in the migration-from-HubSpot segment are now genuinely competitive. Your sales team needs an updated objection-handling line by Monday."
          },
          {
            "competitor": "Relayo",
            "signal": "funding",
            "what_changed": "Closed a $14M Series A led by Bessemer Venture Partners (Sept 11), with participation from Uncork Capital. Simultaneously rebranded the homepage from 'The simple CRM for teams' to 'Revenue automation for modern sales orgs.'",
            "significance": "medium",
            "why_it_matters": "The raise funds a likely 12-18 month sales/marketing blitz, and the repositioning moves them out of head-to-head CRM comparisons into the higher-ACV 'revenue automation' frame where they'll target your upmarket accounts. You'll start losing to them in categories you don't currently monitor."
          },
          {
            "competitor": "Pipeline HQ",
            "signal": "hiring",
            "what_changed": "Posted 7 new roles this week: 5 Account Executives (Mid-Market), 1 Sales Engineer, and 1 Head of Partnerships — a ~30% jump in GTM headcount based on their public team page (from ~23 to ~30 GTM staff).",
            "significance": "medium",
            "why_it_matters": "The Mid-Market AE cluster plus a Sales Engineer and Partnerships lead is the classic signature of a company moving upmarket off a self-serve base. They're coming for the 20-100 seat deals that are your core revenue band, and they'll have live quota-carrying reps within ~6 weeks."
          }
        ],
        "intel": [
          {
            "competitor": "Cadence CRM",
            "meaning": "Cadence is trading margin for logo volume at the bottom of the market and using bundled AI as the hook. This is a defensive land-grab against Pipeline HQ's cheaper self-serve motion, not primarily aimed at you — but you're collateral.",
            "likely_reason": "Their Q2 SMB churn likely ticked up as Pipeline HQ's free tier matured; folding the AI add-on into base pricing recovers perceived value while the $19 anchor slows logo bleed. The widened annual discount suggests they're prioritizing cash-flow certainty over ARPU.",
            "threat_or_opportunity": "Threat to new-logo SMB deals; opportunity in mid-market where their $19 anchor cheapens their brand — position yourself as the CRM that doesn't discount its way out of a retention problem."
          },
          {
            "competitor": "Pipeline HQ",
            "meaning": "The HubSpot sync plus the GTM hiring means Pipeline HQ has decided its next act is displacing incumbents in accounts that already run HubSpot marketing — exactly your ICP overlap.",
            "likely_reason": "Their PLG top-of-funnel plateaued, so they're building the integration and sales muscle to convert free/SMB users into mid-market contracts. Product Hunt momentum gave them air cover to time the sales hiring.",
            "threat_or_opportunity": "Threat to your HubSpot-adjacent pipeline; opportunity to pre-empt by publishing a migration guide and a sync-depth comparison before their new AEs are ramped."
          },
          {
            "competitor": "Relayo",
            "meaning": "Relayo is leaving the CRM category fight and repositioning as a workflow/automation layer — which means they'll stop competing on your terms and start competing on outcomes (pipeline created, tasks automated).",
            "likely_reason": "Bessemer's thesis rewards category creation over feature parity; a 'revenue automation' frame supports a higher ACV and a cleaner narrative for the Series B story 18 months out.",
            "threat_or_opportunity": "Opportunity short-term (they've vacated head-to-head CRM comparisons), threat medium-term as their funded motion targets your expansion revenue. Watch their first 3 automation features to see if it's real or just messaging."
          }
        ],
        "battlecards": [
          {
            "competitor": "Cadence CRM",
            "strengths": [
              "Now the cheapest credible entry point at $19/seat with AI call summaries bundled in",
              "Strong native dialer and call-logging that SMB sales teams rate highly (4.5 on G2, 900+ reviews)",
              "Fast, opinionated onboarding — teams are live in under a day"
            ],
            "weaknesses": [
              "Reporting and forecasting are shallow — no custom pipeline stages beyond 7, and no revenue attribution",
              "The $19 tier caps at 3 seats and 1,000 contacts, so the real usable price jumps to $39 fast",
              "API rate limits (100 req/min) frustrate teams doing any custom integration work"
            ],
            "pricing": "Starter $19/seat/mo (was $29, capped at 3 seats/1,000 contacts), Growth $39/seat/mo, Scale $69/seat/mo; 20% off annual. AI summaries now included Growth and up.",
            "positioning": "'The CRM your reps will actually use' — fast, call-centric, cheap. Aimed squarely at 2-20 seat sales teams that want minimal setup.",
            "how_to_win": [
              "In sub-20-seat deals, force the real price into the open: show that once they pass 3 seats or 1,000 contacts they're at $39 — the same neighborhood as you, without your forecasting depth",
              "Demo custom pipeline stages and revenue attribution live; their 7-stage cap and missing attribution is where reporting-serious buyers flip",
              "Ask 'what happens when you outgrow the dialer?' — position yourself as the CRM they won't have to re-platform off in 18 months"
            ]
          },
          {
            "competitor": "Pipeline HQ",
            "strengths": [
              "Best-in-class self-serve onboarding and a genuinely free tier that builds bottoms-up champions",
              "New bidirectional HubSpot sync closes their biggest data-integrity gap",
              "Modern, fast UI that demos extremely well and wins design-led evaluations"
            ],
            "weaknesses": [
              "Brand-new mid-market sales team — reps are unramped and SE coverage is thin (1 SE for 5 new AEs)",
              "No role-based permissions or audit logging on plans below Enterprise, a blocker for 50+ seat orgs",
              "Support is community/email only until the top tier; no dedicated CSM for mid-market"
            ],
            "pricing": "Free (up to 3 users), Pro $25/seat/mo, Business $45/seat/mo, Enterprise custom. HubSpot sync requires Business and up.",
            "positioning": "'CRM that grows with you, from free to scale.' PLG-first, developer-friendly, now reaching upmarket via HubSpot sync and a fresh mid-market sales team.",
            "how_to_win": [
              "In 40+ seat deals, lead with governance: role-based permissions and audit logs that they gate behind Enterprise or lack entirely — a hard requirement for security reviews",
              "Exploit the ramp gap: their AEs are weeks old with thin SE support, so out-execute on implementation and a named CSM commitment",
              "For HubSpot accounts, get ahead of the sync story with a published field-level comparison showing where their sync drops custom objects and workflow triggers"
            ]
          }
        ],
        "trends": [
          "AI call/meeting summarization is moving from paid add-on to table-stakes bundle across the category (Cadence just did it; expect Pipeline HQ within a quarter) — stop pricing it as a differentiator and start pricing on data depth and workflow.",
          "The mid-market (20-100 seats) is the contested battleground this quarter: Pipeline HQ is hiring into it and Cadence is trying to feed it from below — your defensible ground is governance, forecasting depth, and migration safety.",
          "'CRM' as a category label is fragmenting toward 'revenue automation' (Relayo's repositioning is the leading edge) — buyers will increasingly evaluate on pipeline-created and tasks-automated outcomes, not feature checklists."
        ],
        "filtered_noise_count": 5,
        "flags": [
          "This is a sample preview built on an illustrative scenario to show the format and depth of a live weekly report."
        ],
        "sources": [
          {
            "ref": "C1",
            "quote": "Cadence CRM pricing page, captured Sept 12 2026: 'Starter — $19/seat/mo. Now includes AI Call Summaries.'"
          },
          {
            "ref": "C2",
            "quote": "Pipeline HQ changelog, Sept 9 2026: 'Two-way HubSpot sync is here — contacts, deals, and activity stay in lockstep.'"
          },
          {
            "ref": "C3",
            "quote": "Bessemer Venture Partners announcement, Sept 11 2026: 'We led Relayo's $14M Series A to build the revenue automation layer for modern sales orgs.'"
          }
        ],
        "confidence": 0.78
      }
    }
  ]
};

/** First example per app — kept for the marketing demos that expect a single result. */
export const DEMO_RESULTS: Record<string, DemoResult> = Object.fromEntries(
  Object.entries(DEMO_EXAMPLES).map(([k, v]) => [k, { schema: v[0].schema, result: v[0].result }]),
);
