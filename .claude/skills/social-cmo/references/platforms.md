# Platform playbook for all41

Cadence figures are defaults for one founder with limited time. Adjust from `brief.md` capacity answer.

## LinkedIn — primary (the buyer lives here)

- **Why:** founders, consultants, agency owners read and reply here. Sprawl math and sharp-thinking pillars perform best.
- **Cadence:** 3–4 posts/week. Founder profile posts outperform company page; company page reposts + owns the changelog.
- **Formats that fit:** text post with a strong first line (the fold is ~2 lines / 210 chars), document carousel (PDF, 1080×1350, 6–10 slides), 30–60 s screen-recording video, poll once a fortnight.
- **Rules:** no external link in the body on the first hour; put it in the first comment. Line breaks every 1–2 sentences. End with a question. 3 hashtags max, at the end, or none.
- **Company page:** name "all41", tagline "Tell us the job. We'll handle the AI.", industry Software, link `https://all41.app`.

## X / Twitter — secondary, build-in-public home

- **Cadence:** 1 post/day plus 1 thread/week. Changelog entries post here first, same day.
- **Formats:** single posts under 200 chars, threads of 5–8 (each tweet stands alone), 15–30 s video, screenshots of the price-before-run moment.
- **Rules:** hook is the whole tweet. No hashtags. Quote-post your own thread the next morning with a one-line summary. Reply to solo founders talking about tool costs; do not pitch, add the number.

## Instagram — visual proof, third

- **Cadence:** 2 posts/week + 3 stories/week. Reels over statics.
- **Formats:** carousel 1080×1350 (the three-lights carousel is the house format), reel 1080×1920 9:16 15–30 s with captions burned in, story with poll or question sticker.
- **Rules:** first slide is the hook and readable at thumbnail size (max 8 words). Caption: hook line, one blank line, 2–4 short lines, CTA "link in bio". Up to 5 hashtags, niche not broad.

## TikTok — optional, only if founder is on camera

- **Cadence:** 3/week or do not start. The algorithm punishes gaps less than LinkedIn rewards consistency, but it needs volume.
- **Formats:** face-to-camera "I paid for eight tools" style, screen recording with voiceover, 20–45 s. Text hook on screen in first 1 s.
- **Rules:** no brand-first content. Story first, product in the last 5 seconds. Reuse as reels and shorts.

## YouTube Shorts — reuse only

Same file as reels and TikTok. Title = hook. No separate production.

## Threads — reuse X posts, softer tone, questions do well

Post the X single posts here with the question first. Low effort, some early-adopter reach.

## Handles

Check `all41` on every platform. Fallbacks in order: `all41app`, `all41_app`, `useall41`, `all41hq`. Use the same handle everywhere or the two-tier pattern: brand `@all41app`, founder personal handle unchanged.

## Bios (character budgets)

| Platform | Limit | Draft |
|---|---|---|
| LinkedIn page tagline | 120 | Tell us the job. We'll handle the AI. Price before it runs. Start with $2 free. |
| X | 160 | Tell us the job. We'll handle the AI. One chat, price before it runs, $2 free. Built in public by [founder]. |
| Instagram | 150 | Tell us the job. We'll handle the AI. ↓ One chat. Done. Start with $2 free. |
| TikTok | 80 | Tell us the job. We'll handle the AI. $2 free ↓ |
| Threads | 500 | Same as X plus one line on the three lights. |

## Link strategy

All platforms link to `https://all41.app` with UTM `?utm_source=<platform>&utm_medium=social&utm_campaign=profile`. Posts link to specific pages: `/pricing` for sprawl math, `/apps` for app posts, `/resources` for today's pick, `/updates` for changelog.

## Posting times (starting point, adjust after 4 weeks of data)

Target audience is solo operators in WIB (UTC+7) and US/EU if English-first. Post LinkedIn 08:00–09:30 local of the primary market; X 09:00 and 17:00; Instagram 12:00 and 19:00. Decide primary market in `brief.md`.

## Metrics the CMO watches

| Stage | Metric | Where |
|---|---|---|
| Reach | impressions, follower growth/wk | platform analytics |
| Engagement | saves + comments (not likes) | platform analytics |
| Intent | profile → link clicks | UTM in Vercel Web Analytics |
| Conversion | sign-ups with $2 credit, first run completed | Supabase `profiles` / `api_usage_log` counts |
| Retention proxy | users who run a second task within 7 days | Supabase |

Weekly review: one table, five rows, one decision.
