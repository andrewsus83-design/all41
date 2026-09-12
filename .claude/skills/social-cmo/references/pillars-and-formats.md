# Pillars, series, and the repurposing map

## Pillar detail

### 1. Sharp thinking (30%)
The idea that sells the brand without mentioning the product: clarity before AI. Angles: the two questions (what, and what will you decide with it); why vague in means vague out; "you don't need to learn AI, you need to know what you want"; the 20-second briefing habit. CTA: a question the reader answers in the replies.

### 2. Sprawl math (25%)
Money, named tools, real list prices. Angles: the $297 stack; "you open two of the eight"; per-task vs per-month; what $2 free actually runs; "credits that don't reset" vs subscriptions. CTA: `/pricing` "work out your number".

### 3. Build in public (20%)
Every `updates.ts` entry, the same day, in the founder's voice. Angles: what shipped, what it cost, what broke, what we removed. Also the daily AI test as a thing we run. CTA: `/updates` or a reply.

### 4. Show the loop (15%)
Proof. Screen recording or screenshots of: describe → price → run → result with sources. One app per post. Angles: Morning Briefing before the first call; Competitor Crawler on a pricing page; Content Pipeline from a case study. CTA: `/apps`.

### 5. Today's pick (10%)
Recurring, low effort, curiosity. "Today's best AI for research changed." Only with real benchmark rows. CTA: `/resources`.

## Recurring series (name them, keep them)

| Series | Platform | Cadence | Format |
|---|---|---|---|
| **The Bill** | LinkedIn, IG | weekly | T2 card, one tool per week added to the running total |
| **Shipped** | X, LinkedIn page | on release | T5 card + 2-line post |
| **Two Questions** | LinkedIn, Threads | weekly | text post, ends with the reader's own two questions |
| **20 Seconds** | IG reel, TikTok, Shorts | weekly | screen recording of one job end to end |
| **Today's Pick** | X | daily when data exists | T6 card or plain text |

## Repurposing map (repo → posts)

| Source in repo | Becomes |
|---|---|
| `updates.ts` entry | Shipped post (X + LinkedIn page), T5 card |
| `faq.ts` item | one LinkedIn text post per FAQ (14 posts ready), Threads question |
| `sprawl.ts` row | one "The Bill" card per tool (8 posts) |
| `apps.ts` `APP_META[*].sample` | a carousel showing a sample output, slide per item |
| `apps.ts` `PERSONAS` | four "a Monday with all41" stories, one per persona |
| `page.tsx` section copy | statement cards, T1 |
| `ROADMAP_APPS` | one "coming" teaser per app, only when a date is real |
| Master Plan §5 competitors | never named as products; use the bill instead |

## Launch sequence (default 14 days, edit in brief.md)

| Day | Platform | Pillar | Post |
|---|---|---|---|
| −7 | LinkedIn founder | Sharp thinking | "I stopped asking AI for things. I started briefing it." (no product) |
| −5 | X | Build in public | Thread: why per-task pricing, the $297 stack |
| −3 | LinkedIn founder | Sprawl math | The Bill, full stack, T2 |
| −1 | IG, X | Show the loop | 20-second reel: one job, price before run |
| 0 | all | Launch | "all41 is live. Tell us the job. $2 free, no card." T3 carousel |
| +1 | X | Shipped | The three apps, one line each |
| +2 | LinkedIn | Sharp thinking | Two Questions |
| +3 | IG | Show the loop | Morning Briefing sample output carousel |
| +5 | LinkedIn | Sprawl math | "You open two of the eight" |
| +7 | X, LinkedIn | Build in public | Week one numbers: what ran, what it cost us, what broke (real only) |
| +9 | IG reel | Show the loop | Competitor Crawler on a real pricing page |
| +11 | LinkedIn | Sharp thinking | "You don't have to learn AI" (New-to-AI framing) |
| +13 | X | Today's pick | first real benchmark table |
| +14 | all | Sprawl math | "Two weeks, $X of tasks, here is the bill" |
