# all41 — Frontend, Copy & SEO Master Doc (for Claude Code)

**One document. Everything the frontend build needs: design philosophy, tokens, rules, components, the hero, the lean homepage copy, the 20 apps with live demos, and the SEO/GEO/social + schema. Build every screen from this. When in doubt, this decides.**

Interactive visual references (show the look in action; this doc is the spec):
`all41_design_system_v7.jsx` · `all41_typeform_flow.jsx` · `all41_service_selector.jsx`

═══════════════════════════════════════════════════════════════════════
# 1 · PHILOSOPHY (the feeling every screen must produce)
═══════════════════════════════════════════════════════════════════════
all41 is for non-technical people tired of AI being complicated. Every UI + copy decision serves one feeling: **"this is easy, calm, and made for me."**

Five principles: **warm** (not clinical) · **calm** (not busy) · **guided** (not dumped) · **clear** (not clever) · **friendly** (never rigid).
Through-line: *warm + calm + guided + clear + friendly = "AI made easy."* If a choice makes the product feel colder, busier, harder, or more clinical — it's wrong.

**Two experience modes:**
- **GUIDED (Typeform-style)** — for input: briefing, app/service setup, onboarding, app builder. One focused screen, up to 5 grouped questions, big tappable cards, smooth progress.
- **CONSUMPTION (normal layout)** — for output/overview: dashboard, results, marketplace. Show useful info together.
Use GUIDED where guiding reduces load; CONSUMPTION where users need to see a lot. Never force a dashboard one-question-per-screen; never dump a 12-field form where a flow belongs.

**Copy law:** never teach AI, never rank models, never explain "what AI can do." Every line names a pain the reader feels, or hands relief. Lead with WHY. Fewer words. Pay only when you use.

═══════════════════════════════════════════════════════════════════════
# 2 · DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════
**Colors (warm; WCAG AA):**
```
bg #FDFBF7 · surface #FFFFFF · surface2 #F6F1E9 · sunken #F0EBE0
border #ECE6DA · border2 #DDD4C4
ink #1E1C1A (headings) · body #4A453E (body, NEVER pure black) · muted #6E6A62 · faint #9A9488
coral #FF6B5E/soft #FFEDEA/deep #D8402F · amber #FFB020/#FFF3D9/#A96A00
green #2FBE7E/#E2F6EC/#0E7A4B · violet #7C6AEF/#EEE9FF/#5341C4 · sky #3BA8F5/#E4F2FE/#1E7FC4
```
Deep variant for text, soft for backgrounds/badges, solid for fills/icons. Never full-saturation signal color as body text on cream.

**Gradients (keep it from feeling rigid):**
```
sunrise #FFB020→#FF6B5E (hero, warm CTA) · warm #FF8A6B→#FF6B5E (accents)
fresh #2FBE7E→#3BA8F5 (go/success) · dusk #7C6AEF→#3BA8F5 (premium)
soft #FFF3D9→#FFEDEA (pale card bg) · ink #2A2724→#1E1C1A (primary CTA)
mesh: radial coral/violet/green pales (hero/section backdrops)
```
Use on: hero, the ONE primary CTA per screen, accent chips, illustration blobs, card header bands. Never on: body-text backgrounds, tables, dense UI. 135°, 2 warm stops, one focal point per screen, white text only (must stay AA). Gradients garnish — never carry the UI.

**Type:** Inter (display+body+UI, 400–800) · Kalam (handwriting accent, large & sparing only) · Space Mono (numbers/prices only).
```
Display 44/800/-0.03em/1.05 · H1 34/800/-0.025em · H2 26/700 · H3 20/700
Body L 18/400/1.65 · Body 16/400/1.6 (color body) · Small 14/muted · Caption 12/600 faint
Accent 26/Kalam/amber-deep · Data 20/700/Space Mono/green-deep
```
Paragraphs: 16px/1.6, color #4A453E; max 60–75 chars (~640px); 16px between paras; one idea each.

**Spacing (4px grid):** 4·8·12·16·20·24·32·48·64·80·96. Card padding 24; between elements 16; between cards 16; between sections 64–80. When unsure, add space.

**Radius:** xs8·sm12·md16·lg20·xl26·xxl34·pill999 (inputs sm/md · cards xl · big cards xxl · buttons/badges pill).
**Shadow (warm, soft):** sm `0 2px 8px rgba(30,28,26,.05)` · md `0 10px 28px rgba(30,28,26,.10)` · glow(c) `0 12px 32px {c}2E`.

═══════════════════════════════════════════════════════════════════════
# 3 · COMPONENT RULES
═══════════════════════════════════════════════════════════════════════
**Buttons (pill; variant × size × gradient):** sizes sm38·md46·lg54 (≥44px touch = md/lg on mobile).
Variants: primary(ink grad)·warm(sunrise grad)·go(fresh grad)·soft(surface2+border)·ghostCoral/Green/Amber.
Rules: one primary per screen; gradient only for the single top action; verb labels ("Run it," not "Submit"); icon left optional; press scale 0.97/150ms; mobile primary = full-width sticky bottom; destructive = ghostCoral + confirm, never a gradient.

**Grid & resolution:** 12-col, gutters 24/16/12. Max-width 1200 app · 960 docs · 640 text. Card grids `auto-fit minmax(260–340px,1fr)`.
```
Mobile <640: 1 col · bottom tab bar · full-width buttons · base 16px
Tablet 640–1024: 2 col
Desktop 1024–1440: 3–4 col
Wide >1440: cap 1200px centered
```
Mobile-first; never shrink desktop onto a phone; base font 16px everywhere (no input-zoom); never >4 cards across; test 360/390/768/1440.

**Mobile:** bottom tab bar (not hamburger) for core nav; primary full-width sticky; one column; inputs ≥16px; big tap areas.

**Motion:** one animation per interaction; press 0.97/150ms; flow screens slide-in (opacity+12px/350ms). No scroll reveals, no bouncing. Calm.

**Reusable inventory (build once, compose everywhere):** Button · Pill/Badge · Card · Input+Label+Helper · Option card · Chip · Tabs · Top nav · Bottom tab bar · Avatar · Credit chip · Cost preview · Progress bar (traffic-light coral→amber→green) · Guided flow (Typeform) · Big service card · Empty state · Loading (stepped) · Modal/Sheet · Toast · Data stat (mono) · App card · Section header.

**Empty & loading (never skip):** Empty = friendly, gradient icon + Kalam line ("nothing here yet!") + heading + one warm CTA; never apologize. Loading = stepped (checks turning green) + traffic-light bar; never a dead spinner.

═══════════════════════════════════════════════════════════════════════
# 4 · THE TWO SIGNATURE FLOWS
═══════════════════════════════════════════════════════════════════════
**A) GUIDED SETUP (Typeform-style)** — for briefing/app setup/onboarding/app builder. Reads an app's config_schema.
- Up to **5 grouped questions per screen** (group related; never one-per-screen for obvious groups, never dump all at once).
- Progress ("X of Y" + bar); smooth slide; tap-to-select with check state; big conversational questions; soft mesh backdrop.
- **Focus mode:** hides BOTH left panel + chat → distraction-free. **Hide/unhide left panel** and **hide/unhide chat** independently (floating "Chat" button when hidden).
- Ends on a **Ready screen** with the transparent price shown before running ("~$X for this run") + Run. Never charge a failed run.

**B) SERVICE PICKER (big cards)** — for choosing a service inside an app, and the app marketplace.
- Services as **large full cards**, never a dense list/dropdown. Each: gradient header + big icon, plain title + one line, **price up front** (mono), cadence, one action ("Set up →"), optional "★ Popular".
- 2 across desktop, 1 full-width mobile; gentle hover lift; selected = colored glow + check. Tapping → its Guided Setup. Sticky "Continue" when picked.

═══════════════════════════════════════════════════════════════════════
# 5 · THE HERO (pick one; A or D recommended)
═══════════════════════════════════════════════════════════════════════
Grounded in 2026 research: the deepest AI pain for non-technical people is **overwhelm/fatigue** — too many tools (30+ new AI tools/day, 52% of AI licenses unused), "AI brain fry," evaluation exhaustion, mediocre results, wasted subscription cost. Lead the hero with *relief from the chaos*.

**A (recommended — hits tool-overwhelm + relief):**
### One place. The right AI for any job.
Sub: Stop juggling ten AI tools. Tell us the job — the right AI does it. No prompts, no subscriptions.

**D (recommended — calmest, zero friction):**
### Tell us the job. Get it done.
Sub: The right AI for the work — no learning, no juggling, no subscription. Pay only when you use.

**B:** Stop learning AI. Just get the job done. **C:** Too many AI tools? Just use one.

Accent (Kalam): *pay only when you use ✿* · Buttons: **Start free — $2, no card** · See what it does ↓
*(Commit to one; test A vs D later.)*

═══════════════════════════════════════════════════════════════════════
# 6 · THE HOMEPAGE (only 5 blocks, ~120 words — never more)
═══════════════════════════════════════════════════════════════════════
**1 · HERO** — the chosen headline + accent + one-line sub + Start free button + "See what it does ↓".

**2 · THREE CARDS** — headline: *The best AI, for every job.* Each card: big line + ONE-line answer.
- **Your AI makes things up?** → We show the sources. And double-check.
- **Why use one AI when you can use them all?** → The best AI for each job, working together. Big results, small cost.
- **Only pay for what you use.** → No hidden cost. No wasted cost. Quiet week = $0.

**3 · APPS** — headline: *Ready-made tools. Just answer a few questions.* Big cards (feature 4–8, link to all 20). Each = name + one line + price:
- SEO + GEO — get found on Google & AI. ~$3
- Proposal / RFP — win the bid. ~$8
- Clip Video — 10 clips from one video. ~$0.60
- Web Builder — a site that finds customers. pay per run
One line under cards (plain words, no jargon): *For each job, all41 picks the right AI, gives it only what it needs, and combines the best tools behind the scenes — sharper results, no dozen subscriptions, nothing to learn.*
Link: See all tools →

**4 · PRICING** — *Top up. Pay per task. That's it.* / No subscription. A quiet week costs nothing. / Start free.

**5 · START** — *Try one job. See what comes back.* / No card. No setup. $2 free. / Start free.
Footer: The AI does the work. You keep the result. · Built in public.

**Homepage copy rules:** 5 blocks ~120 words; every line one short sentence; answers = ONE line (full answers in FAQ); numbers short mono (~$3); lead with pain/value then relief; when tempted to add a sentence → put it in FAQ instead; verbs on buttons; white space > words.

═══════════════════════════════════════════════════════════════════════
# 7 · THE 20 APPS — launch all, each with a live demo (the SEO/GEO engine)
═══════════════════════════════════════════════════════════════════════
**Strategy:** every app gets its own page with a **live demo** (pre-filled with the easiest, highest-demand use case) so a visitor SEES the output instantly, no signup. Each demo page is an SEO/GEO asset targeting that app's search terms — 20 pages carry the SEO/GEO load while the homepage stays lean.

| # | App | Killer demo | Pre-filled example | Ranks for |
|---|---|---|---|---|
| 1 | SEO + GEO Optimizer | See why your site isn't on Google or in ChatGPT | demo bakery site · Both · 1 competitor | SEO audit, get cited by AI |
| 2 | Proposal / RFP Maker | Turn this RFP into a winning proposal | sample 1-page RFP · Commercial | RFP response, proposal writer |
| 3 | Clip Video | Turn one podcast into 10 TikToks | sample YouTube link · 10 · punchy | video to clips, Opus Clip alt |
| 4 | Web Builder | A one-page site in 60 seconds | coffee cart · Warm · 1 page | AI website builder, Wix alt |
| 5 | Content Pipeline | One idea → a week of posts | "local coffee vs chains" · 5 posts | content calendar, Jasper alt |
| 6 | Competitor Intelligence | What your competitor changed this month | sample brand · pricing | competitor analysis AI |
| 7 | Local SEO / Google Business | Get found on Google Maps | nail salon · your city | local SEO, Google Business |
| 8 | Translate Document | Translate this brochure, keep the layout | sample PDF · Spanish | translate PDF keep formatting |
| 9 | Narrate / Voiceover | Turn this article into a voiceover | sample paragraph · Warm | text to speech, AI voiceover |
| 10 | Deep Research / Market Report | Research this market in 5 minutes | "oat milk market" · quick | market research AI |
| 11 | Email Campaign / Newsletter | Write a welcome email sequence | fitness app · 3 emails | email sequence AI |
| 12 | Doc / Data Analyzer | Ask questions about this 40-page report | sample report · "what are the risks?" | analyze PDF, chat with docs |
| 13 | CRM Lite | Find leads I haven't followed up with | sample list · 30-day rule | simple CRM, HubSpot alt |
| 14 | Invoice / Expense Tracker | Pull every invoice from my inbox | demo inbox · this month | invoice tracker, scan invoices |
| 15 | Social Monitor / Brand Mentions | See who's talking about your brand | sample name · Reddit, X | brand monitoring, social listening |
| 16 | Meeting Notes / Action Items | Turn this meeting into action items | sample transcript | meeting notes AI, Otter alt |
| 17 | Grant Writer | Draft a grant application from this call | sample grant call · nonprofit | grant writing AI |
| 18 | Ad / PPC Audit | Find wasted spend in this ad account | demo ad account | PPC audit, Google Ads audit |
| 19 | Campaign Kit | One campaign: page + posts + email | "summer sale" · a shop | marketing campaign AI |
| 20 | Reminder / Automation Hub | Run my competitor check every Monday | Competitor Intel · Mon 9am | AI automation, Zapier alt |

**Each app page structure (GUIDED where it configures, CONSUMPTION where it shows results):**
1. One-line promise (the killer use case) + price + "Try it free — $2".
2. **Live demo** — pre-filled example runs / shows a pre-generated result instantly (no signup to understand).
3. One line on how it works (plain words).
4. What it replaces ("instead of Opus Clip at $15–50/mo").
5. FAQ (3–4 Q's) — carries the app's SEO keywords + GEO Q&A (keyword-rich text lives here, off the homepage).
6. CTA — Start free.
Schema per page: SoftwareApplication + FAQPage + BreadcrumbList.

═══════════════════════════════════════════════════════════════════════
# 8 · FAQ (homepage stays lean; detail + SEO/GEO value lives here)
═══════════════════════════════════════════════════════════════════════
- **Do I need to know anything about AI?** No. Say what you need in plain words, like a colleague. No prompts, no settings.
- **Do I need API keys?** Never. That part is ours.
- **Why do AI answers get things wrong — how is this different?** Ordinary AI guesses to sound confident. all41 answers from your files + the live web, shows sources, and double-checks important jobs before you see them.
- **Which AI does it use? Is it the best?** It changes daily — that's the point. We test the models every day and send each job to whichever won today.
- **Why cheaper than my subscriptions?** You pay for work, not tools you forgot you're paying for. A few dollars a task, shown before it runs. No monthly fee.
- **Does it remember my past work?** Yes — files and past jobs stay connected, so each job starts smart. Tired of re-explaining to AI? You won't here.
- **How do you use "all" the AIs and keep it cheap?** For each job we pick the specialist AI, give it only the context it needs, and combine the right tools behind the scenes. Better results, no dozen subscriptions.
- **Do credits expire?** After 12 months. No monthly reset.
- **Are you sure it's good?** Every month we run the same job three ways — all41, regular AI, a professional — and let independent judges score them blind. We publish the results. [See the benchmark →]
- **Is my data private?** Your data answers your questions only.

═══════════════════════════════════════════════════════════════════════
# 9 · SEO / GEO / SOCIAL
═══════════════════════════════════════════════════════════════════════
**SEO wedge:** don't fight "best AI tool." Rank the tired, post-hype intent — "AI that doesn't make things up," "stop paying for AI subscriptions," "cheaper alternative to [SEMrush/Jasper/Opus Clip]," "AI I don't have to learn," "AI that picks the best model." The 20 app pages + FAQ carry this; the homepage stays lean.
**Titles/meta:** Home — "all41 — the AI that does the work, not another AI to learn." App pages — "[App] — instead of [tool] at [$/mo]. ~$X per run, no subscription." Unique per page.
**Technical:** submit sitemap to Bing + Google (ChatGPT search = Bing); allow GPTBot/PerplexityBot/ClaudeBot/Google-Extended; per-page OG images (replace placeholders).
**GEO:** Q&A format (FAQ + app-page FAQs) is the citation goldmine — self-contained first sentences, concrete numbers, named comparisons. The monthly benchmark page is the top citable asset. Build entity consistency + a Wikidata entry.
**Social:** the 3 homepage lines + each app's killer demo are the hooks; Reddit doubles as GEO. One voice everywhere.

═══════════════════════════════════════════════════════════════════════
# 10 · SCHEMA (JSON-LD — paste into matching pages)
═══════════════════════════════════════════════════════════════════════
```json
// Homepage: Organization
{ "@context":"https://schema.org","@type":"Organization","name":"all41","url":"https://all41.app",
  "description":"all41 is an AI work engine for non-technical people. Describe a job and the right AI does it — no prompts, no keys, no subscription. Pay only when you use." }
// Homepage: WebSite + search
{ "@context":"https://schema.org","@type":"WebSite","name":"all41","url":"https://all41.app",
  "potentialAction":{"@type":"SearchAction","target":"https://all41.app/apps?q={q}","query-input":"required name=q"} }
// Each app page: SoftwareApplication (duplicate per app w/ its name/desc/price)
{ "@context":"https://schema.org","@type":"SoftwareApplication","name":"all41 SEO + GEO Optimizer",
  "applicationCategory":"BusinessApplication","operatingSystem":"Web",
  "description":"A professional SEO + GEO audit that gets you found on Google and cited by AI. Pay per run, no subscription.",
  "offers":{"@type":"Offer","price":"3.00","priceCurrency":"USD","description":"Pay-per-use, ~$3–5 per audit."} }
// FAQ page + section: FAQPage (map each Q/A from §8)
{ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  {"@type":"Question","name":"Do I need to know anything about AI?","acceptedAnswer":{"@type":"Answer","text":"No. Say what you need in plain words, like a colleague. No prompts, no settings, nothing to pick."}}
  /* …repeat for each FAQ… */ ] }
// App pages: BreadcrumbList (Apps → app name)
```

═══════════════════════════════════════════════════════════════════════
# 11 · NON-NEGOTIABLES (override everything)
═══════════════════════════════════════════════════════════════════════
1. Warm, calm, guided, clear, friendly — every choice serves "AI made easy."
2. WCAG AA on all text; body #4A453E, never pure black on cream.
3. Everything rounded (pills for buttons/badges); no sharp corners.
4. One primary action per screen; gradients garnish, never dominate.
5. Numbers in Space Mono; Kalam large & sparing; prose in Inter.
6. Mobile-first: bottom tab bar, full-width sticky primary, 44px targets, 16px inputs.
7. GUIDED for input (Typeform, big cards); CONSUMPTION for output (dashboard, results).
8. Prices shown before anything runs; never charge a failed run (UI reflects this).
9. Plain language, verbs on buttons, no jargon.
10. Homepage = 5 blocks ~120 words; detail + SEO/GEO lives in the 20 app pages + FAQ. When unsure, add space and cut words.

---

*This is the whole frontend + copy + SEO spec. Build the homepage lean (5 blocks), give each of the 20 apps a killer live-demo page (SEO/GEO engine), keep every screen warm/calm/easy, and let the FAQ + app pages carry the depth. Feeling to protect above all: "AI made easy."*
