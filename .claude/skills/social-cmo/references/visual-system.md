# Visual system for all41 social

Derived from `globals.css` and Master Plan §16. Dark mode is the brand. Light variants only for LinkedIn document carousels where dark PDFs render badly on some clients.

## Palette

| Token | Hex | Use |
|---|---|---|
| bg | `#0b0c0f` | canvas |
| bg-elev | `#121317` | cards, panels |
| bg-elev-2 | `#1a1b21` | nested surfaces |
| fg | `#f4f4f5` | primary text |
| fg-muted | `#a1a1aa` | secondary text |
| fg-faint | `#63636b` | labels, eyebrows |
| red | `#ff4d4f` | Stop & Think |
| amber | `#ffb020` | Prepare |
| green | `#2fd27d` | Go & Track, CTAs, prices |
| line | `rgba(255,255,255,0.08)` | hairlines |

Rule: **one phase colour per artboard**, used on the eyebrow, one accent, and nothing else. Never all three at once except on the "three lights" carousel or the cycle diagram.

## Type

- **Titles:** Space Grotesk, semibold, tight leading (1.02). Big. A social title is 2 lines max.
- **Body:** DM Sans, regular, leading 1.55.
- **Numbers and money:** JetBrains Mono, always. `$0.12`, `$297/mo`, dates.
- **Reflective closing line:** Instrument Serif italic, muted colour. *"Other AI tools let you be lazy. all41 makes you sharp."*
- **Eyebrow:** DM Sans 11–12 px equivalent, uppercase, tracking 0.18em, phase colour.

Google Fonts links: Space Grotesk, DM Sans, JetBrains Mono, Instrument Serif. All free.

## Layout rules

- 8px grid. Generous margins: 96 px on a 1080 canvas, 120 px on 1080×1350.
- Corners: Apple continuous, 22–36 px on social cards. Buttons 12–16 px.
- When in doubt: bigger type, more space, one fewer element.
- Max 12 words on any single image. Max 8 on a first slide.
- Logo mark bottom-left, small. Handle bottom-right, `fg-faint`.
- Screenshots of the product: real UI only, on `bg-elev` card, 22 px corners, 1 px `line` border, no drop shadows, no device mockups.

## Templates

### T1 — Statement card (1080×1080 and 1080×1350)
Eyebrow (phase colour) → Title (Space Grotesk, 2 lines) → one supporting line (DM Sans, muted) → reflective serif line at the bottom → logo. Use for sharp-thinking pillar.

### T2 — The bill (1080×1350)
Left column: list of tools with prices in JetBrains Mono, hairline dividers. Right or bottom: total in 96 px mono, then `all41 · pay per task · $0.05–$0.25`, green. Use for sprawl math.

### T3 — Three lights carousel (1080×1350, 3–5 slides)
Slide 1: hook on `bg`. Slides 2–4: one per light, full-bleed phase-soft background (`rgba(phase,0.14)`), the light name as eyebrow, one sentence title, one line body. Slide 5: CTA, green, "$2 free, no card". House format.

### T4 — Price-before-run (1080×1920 reel / 1080×1350 static)
A real screenshot of the briefing chat at the moment the price shows. Circle nothing. Caption on image: "It tells you the price before it runs." Use for show-the-loop pillar.

### T5 — Changelog card (1080×1080)
Eyebrow "Shipped · 2026-09-12" in mono → title from `updates.ts` → body 2 lines → "all41.app/updates". Use for build-in-public, same day as the entry.

### T6 — Today's pick (1080×1080)
Table: Kind of job · Today's pick · Typical cost. Three rows. Numbers in mono. Footer: "Tested today." Only with real data from the benchmark table.

### Banner / header (LinkedIn 1128×191, X 1500×500)
Dark canvas, title left "Tell us the job. We'll handle the AI.", three small dots red · amber · green on the right, nothing else.

### Avatar (400×400+)
Wordmark "all41" in Space Grotesk semibold on `#0b0c0f`, or a single green dot on dark if the wordmark is illegible at 48 px. Same avatar on every platform.

## Motion (reels, shorts, LinkedIn video)

- Cuts on the beat of the sentence, not music. Voice or captions carry it.
- Screen recordings at 1.25–1.5× with the price moment held at 1× for 2 s.
- Captions burned in, DM Sans, white on `rgba(0,0,0,0.6)` pill, 22 px corners.
- End card: T1 statement card, 2 s, green CTA.

## Image-tool prompt pattern (when generating rather than designing)

"Minimalist dark UI poster, near-black background #0b0c0f, one accent colour <hex>, large geometric sans-serif headline '<copy>', generous negative space, 8px grid, rounded card with 1px subtle border, no people, no gradients, no glow, no 3D, flat, editorial." Then place real type in a design tool; never let the image tool render the copy.

## Do not

- Gradients, glows, neon, glassmorphism, 3D icons, robots, brains, sparkles.
- Stock photos of people at laptops.
- Light mode by default.
- More than one phase colour per artboard (except T3 and the cycle diagram).
- Fake UI. If a screen does not exist, do not draw it.
