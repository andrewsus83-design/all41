import type { FaqItem } from "@/content/faq";
import { APP_META } from "@/content/apps";

/**
 * Per-tool "solution page" content (Jasper-style): what it replaces, who it is for, and an FAQ.
 * Keyed by mini_apps.slug. The FAQ here is the GEO citation asset — self-contained answers.
 * Drafted per app and edited to the all41 voice. Prices in `replaces` are conservative ranges.
 */
export type AppPage = {
  replaces: string;
  useCases: { who: string; job: string }[];
  faqs: { q: string; a: string }[];
};

export const APP_PAGE: Record<string, AppPage> = {
  "seo-geo-optimizer": {
    "replaces": "SEMrush / Ahrefs ($99–139/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "See exactly what to fix so Google and AI answers find your site — without learning a dashboard."
      },
      {
        "who": "Marketing lead on a small team",
        "job": "Get a ranked, plain-language to-do list you can hand straight to a developer."
      },
      {
        "who": "Freelancer or small agency",
        "job": "Run a fast audit per client, share the plan, and pay only for the runs you make."
      }
    ],
    "faqs": [
      {
        "q": "What do I get from the SEO & GEO Optimizer?",
        "a": "You get a plain-language audit of your site plus a ranked list of fixes, in priority order. A specialist team checks how you show up in Google search and in AI answers, then hands you a plan you can act on today — no dashboard to learn, no jargon to decode."
      },
      {
        "q": "What is GEO, and why does it matter?",
        "a": "GEO is optimizing your site so AI answer engines cite you, not just Google. More people now ask an AI instead of scrolling search results, so the audit checks both — the pages Google ranks and the content AI tools quote — and shows where you are missing."
      },
      {
        "q": "How is this different from SEMrush or Ahrefs?",
        "a": "You get a finished plan instead of a dashboard to read yourself. Tools like SEMrush and Ahrefs hand you data and a monthly bill; the SEO & GEO Optimizer reads the data for you and returns a short, ranked list of what to fix — and you pay only when you run it."
      },
      {
        "q": "What does it cost?",
        "a": "About $4 per run, and you pay only when you use it. No subscription, no seat fees, no yearly lock-in — run it once before a launch or monthly as you publish, and you pay for just those runs."
      },
      {
        "q": "How accurate is it, and where does the audit come from?",
        "a": "The audit reads your live site and checks it against current SEO and AI-answer best practices. Every fix names the page and the reason it made the list, so nothing is a black box and you decide what to act on."
      },
      {
        "q": "Can I hand the plan to a developer?",
        "a": "Yes — the plan is written in plain language and ranked by impact, so you can pass it straight to a developer or do the work yourself. Each item says what to change and why, so no one has to translate SEO-speak before starting."
      }
    ]
  },
  "geo-monitor": {
    "replaces": "Profound / Otterly.AI ($30–500+/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "See each week whether AI answer engines name your product when buyers ask for a tool like yours — without hiring anyone."
      },
      {
        "who": "Marketing lead at a small brand",
        "job": "Track how often AI picks you over two named rivals, and whether it speaks about you warmly or coldly."
      },
      {
        "who": "SEO or content manager",
        "job": "Prove your GEO work is landing by watching brand mentions climb week over week, for a few dollars a month."
      }
    ],
    "faqs": [
      {
        "q": "What does GEO Visibility Monitor do?",
        "a": "It checks every week whether AI answer engines mention your brand when people ask about your space, then shows your share of voice and sentiment next to your rivals. You give it your brand, a few competitors, and the questions your buyers ask. Each week it re-runs those questions and reports where you got named, where a rival got named instead, and whether the mention was warm or cold. You watch the trend move instead of guessing."
      },
      {
        "q": "Does it matter whether AI names my brand — isn't my Google ranking enough?",
        "a": "It matters because buyers increasingly ask an AI for a recommendation instead of scrolling Google, and a top ranking no longer guarantees the AI names you. The answer itself has become the new shelf. This tool watches that shelf and tells you if you're on it, so your visibility work follows where people actually look."
      },
      {
        "q": "How much does it cost, and is there a subscription?",
        "a": "It's about $0.90 a run with no subscription — you pay only when you run a check. You see the price before every run, so there's never a surprise bill. A weekly check comes to a few dollars a month, while dedicated AI-visibility tools usually start far higher and lock you into a monthly plan."
      },
      {
        "q": "How accurate is it, and where does the data come from?",
        "a": "Every result comes straight from the AI answer engines' own live responses — nothing is estimated or scored on an invented scale. It asks each engine your real buyer questions and reads back what they actually say, so a mention counts only when the AI genuinely names you. Because those answers shift over time, it re-tests weekly rather than trusting a one-time snapshot."
      },
      {
        "q": "Can I track competitors and see my share of voice?",
        "a": "Yes — you name the rivals you care about, and each week you see how often the AI picks them versus you. Share of voice is simply the slice of AI answers that mention you instead of them, and sentiment tells you who's spoken about more warmly. Over a few weeks you can see whether your content and PR are moving you up the list."
      },
      {
        "q": "What do I need to set it up?",
        "a": "Just your brand name, a few competitors, and a handful of questions your buyers would ask an AI. There's nothing to install and no key to manage — you set those details once and it re-runs the same check each week. You can change the questions or rivals any time."
      }
    ]
  },
  "gap-finder": {
    "replaces": "SEMrush / Ahrefs ($99–139/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "See the keywords you can still rank for this month, before your competitors spot them."
      },
      {
        "who": "Small-team content marketer",
        "job": "Get a short list of gaps to write about next, so the calendar fills itself."
      },
      {
        "who": "Agency owner",
        "job": "Show a client the openings their rivals left wide open, in one run instead of a week of digging."
      }
    ],
    "faqs": [
      {
        "q": "What do I get from Gap Finder?",
        "a": "You get this period's new openings in one run: keyword gaps, content gaps, competitor gaps, and AI-search gaps you can still win. Each one comes with enough context to act on it the same day. Run it at the start of a month or a sprint and you'll know where to point your effort."
      },
      {
        "q": "How is it different from a tool like SEMrush or Ahrefs?",
        "a": "Gap Finder skips the dashboards and hands you a focused list of openings you can win right now. Those tools give you everything and leave the digging to you; this gives you the answer. And there's no monthly seat to keep paying for."
      },
      {
        "q": "What does Gap Finder cost?",
        "a": "About $1.50 a run, and you only pay when you use it. No subscription, no seat fee, nothing to cancel. You see the price before every run, so there's never a surprise charge."
      },
      {
        "q": "Where do the gaps come from, and can I trust them?",
        "a": "Every gap comes from live search and competitor data, and each one shows you where it came from so you can check it yourself. all41 doesn't invent scores or pad the list. If an opening isn't real, it doesn't make the cut."
      },
      {
        "q": "What is an AI-search gap?",
        "a": "An AI-search gap is a question people ask AI answer engines where your competitors show up and you don't. Gap Finder flags those so you can create the content that gets you cited. It's one of the four gap types you get in every run."
      },
      {
        "q": "How often should I run it?",
        "a": "Run it once at the start of each month or campaign, since that's when new openings appear and old ones close. Because you pay per run, twelve runs a year still cost less than a single month of a subscription tool."
      }
    ]
  },
  "rank-pulse": {
    "replaces": "SEMrush / Ahrefs ($99–139/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "See whether this week's content actually moved your top keywords, without opening a dashboard every day."
      },
      {
        "who": "Marketing lead on a small team",
        "job": "Know which ranking changes matter and which are noise, so you brief the team on what to fix first."
      },
      {
        "who": "Freelance SEO / agency of one",
        "job": "Check a client's rankings on demand and pay only for the runs you make."
      }
    ],
    "faqs": [
      {
        "q": "What does Rank Pulse do?",
        "a": "Rank Pulse tracks where you rank for your priority keywords and flags the moves that matter. You pick the keywords you care about. Each run checks your positions and points to the changes worth acting on, not every small wobble. You get a clear read on where you stand, without living in a dashboard."
      },
      {
        "q": "How is Rank Pulse different from SEMrush or Ahrefs?",
        "a": "Rank Pulse does one job, rank tracking, and charges only when you run it. Big suites like SEMrush and Ahrefs bundle dozens of tools into a monthly seat you pay for whether you log in or not. If you mainly want to know where you sit for your keywords, you skip the subscription and pay about $0.2 a run instead."
      },
      {
        "q": "How much does Rank Pulse cost?",
        "a": "Rank Pulse costs about $0.2 per run, with no subscription. You pay only when you use it. No monthly seat, no annual lock-in. Run it daily during a launch, then leave it for a month, and you are charged only for the runs you made."
      },
      {
        "q": "How accurate are the rankings, and where do they come from?",
        "a": "Rank Pulse checks live search positions for the keywords you choose. Rankings shift by location, device, and the day you look, so treat each run as a snapshot in time. Running it on a steady cadence gives you the trend, which matters more than any single number."
      },
      {
        "q": "Which ranking changes does Rank Pulse flag as important?",
        "a": "Rank Pulse flags the moves that change your picture: a keyword breaking onto page one, a drop out of your top spots, a competitor passing you. It sets aside the day-to-day drift of a position sliding a spot or two. So your attention goes to the handful of changes worth a response."
      }
    ]
  },
  "site-health": {
    "replaces": "Semrush / Ahrefs ($99–139/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "Know the week a page breaks or drops out of Google — without checking your site by hand."
      },
      {
        "who": "Freelance SEO or small-agency owner",
        "job": "Keep every client site healthy and catch problems before the client emails you."
      },
      {
        "who": "DTC / ecommerce marketer",
        "job": "Spot a broken product page or a speed drop before it quietly costs you sales."
      }
    ],
    "faqs": [
      {
        "q": "What does Site Health Monitor actually check?",
        "a": "It re-checks your site's technical health every week and flags what changed since last time. That covers broken pages, pages that got slower, and pages that have fallen out of Google search. You get a short list of new problems, not a 200-line audit to wade through. If nothing broke, it tells you that too."
      },
      {
        "q": "How is this different from Semrush or Ahrefs?",
        "a": "It watches for what changed instead of handing you a full report to comb through. Semrush and Ahrefs are big platforms that cost around $99–139/mo whether you open them or not. Site Health Monitor runs on a schedule, costs about $0.50 a run, and only pings you when something new breaks — so you can drop a subscription you barely log into."
      },
      {
        "q": "What does it cost?",
        "a": "About $0.50 a run, and you only pay when it runs — no subscription. You see the price before every run, so there's never a surprise bill. Run it weekly and it comes to a couple dollars a month, versus a $99–139/mo SEO platform. New here? Your first runs come out of a $2 free credit."
      },
      {
        "q": "Where does the data come from — can I trust it?",
        "a": "It checks your live pages directly and reports what it finds: whether each page loads, how fast it loads, and whether it still shows up in Google search. No guessed grades or made-up health scores. If a page returns an error or disappears from search, that's a real signal you can act on, and you see exactly which pages changed."
      },
      {
        "q": "Will it catch a page that quietly drops out of Google?",
        "a": "Yes — that's one of the main things it watches for. Each week it checks whether your key pages still appear in Google search and alerts you when one is gone. A page can drop out of the index while everything on your site still looks fine, so this catches the loss you'd otherwise miss for weeks."
      },
      {
        "q": "How often does it run, and do I have to remember to check it?",
        "a": "It runs once a week on a schedule you set, so you don't have to remember anything. You only hear from it when something new breaks — otherwise it stays quiet. Set the schedule once and get on with your work; it does the checking for you."
      }
    ]
  },
  "advanced-research": {
    "replaces": "ChatGPT Plus / Perplexity Pro ($20–30/mo)",
    "useCases": [
      {
        "who": "Solo SaaS founder",
        "job": "Get a sourced read on a rival's pricing and positioning before you set your own."
      },
      {
        "who": "Agency strategist",
        "job": "Hand a client one deep brief on a new market, with sources they can check."
      },
      {
        "who": "Content marketer",
        "job": "Settle a shaky claim with real sources before it goes on the blog."
      }
    ],
    "faqs": [
      {
        "q": "What is Advanced Research?",
        "a": "Advanced Research is a premium deep dive that decides where to look, digs deeper where it matters, and hands you one sharp, sourced answer. You give it the question. It searches across many places, follows the threads that count, and comes back with a clear answer and the links behind it. It's built for the questions worth getting right, not the quick ones."
      },
      {
        "q": "How is it different from a normal AI chat?",
        "a": "A normal chat answers fast from what the AI already knows; Advanced Research goes and looks, then shows you its sources. It chooses where to search, follows the parts that matter, and hands back one answer you can stand behind. For most marketers it does the job of a $20–30/mo research subscription like ChatGPT Plus or Perplexity Pro, except you pay per run instead of every month."
      },
      {
        "q": "What does it cost?",
        "a": "About $1.50 per run, and you only pay when you use it. No subscription, no seat fee, nothing sitting on your card between runs. You see the price before it runs, so there's never a surprise."
      },
      {
        "q": "Can I trust the answer? Where do the facts come from?",
        "a": "Every answer comes with its sources, so you can check the facts yourself. It reads across many places rather than leaning on one, and it tells you where each point came from. When something is thin or unclear, you'll see that too, not a confident guess dressed up as fact."
      },
      {
        "q": "Can it research a competitor for me?",
        "a": "Yes, a competitor read is one of its most common jobs. Point it at a rival and ask about their pricing, positioning, or latest launch, and it returns a sourced picture you can act on. Because it's built for deep questions, it's a better fit here than a quick chat answer."
      },
      {
        "q": "When should I use this instead of a quick chat?",
        "a": "Use Advanced Research when the answer is worth getting right, like a market you don't know yet, a claim before you publish, or a call with money behind it. For a fast fact or a rough draft, a normal chat is cheaper and fine. Reach for this when a shallow answer would cost you more than ~$1.50."
      }
    ]
  },
  "proposal-rfp-maker": {
    "replaces": "PandaDoc / Proposify ($19–49/mo)",
    "useCases": [
      {
        "who": "Solo consultant",
        "job": "Answer a government or enterprise RFP without hiring a proposal writer."
      },
      {
        "who": "Small agency owner",
        "job": "Turn a 60-page RFP into a compliant first draft in an afternoon, not a lost week."
      },
      {
        "who": "Bid or proposal manager",
        "job": "Check a draft against every RFP requirement before it goes out the door."
      }
    ],
    "faqs": [
      {
        "q": "What do I get from the Proposal / RFP Maker?",
        "a": "You get a consultant-grade proposal draft built from the RFP you paste. A specialist team writes the executive summary, the responses, and the win themes, then runs a compliance check so no requirement is missed. It lands ready to edit, not a blank page."
      },
      {
        "q": "How is this different from proposal software like PandaDoc or Proposify?",
        "a": "PandaDoc and Proposify give you a template to fill in; this writes the draft for you. It reads your RFP, follows the Shipley method that proposal agencies use, and returns a structured response. You bring the RFP. It brings the first draft."
      },
      {
        "q": "What does it cost, and is there a subscription?",
        "a": "It is about $9 per run, and you pay only when you use it. No subscription. Respond to one RFP or ten, and you are charged per proposal, not per month. Proposal consultants and agencies charge thousands for the same Shipley-method work."
      },
      {
        "q": "How accurate is the compliance check?",
        "a": "It maps your draft against every requirement in the RFP you paste and flags what is missing before you submit. It works from your RFP text, not guesses, so the check reflects what the buyer actually asked for. You stay the final reviewer."
      },
      {
        "q": "Can it handle government and enterprise RFPs?",
        "a": "Yes. It is built for structured RFPs, including government and enterprise formats with strict requirements. It follows the Shipley method agencies use for these bids and builds a compliance matrix so each requirement gets an answer."
      },
      {
        "q": "Do I still need to review the draft?",
        "a": "Yes. The draft is a strong starting point, not a final submission. It handles the structure, the compliance, and the first-pass writing, so your time goes to sharpening win themes and pricing. You review, edit, and submit."
      }
    ]
  },
  "bid-no-bid": {
    "replaces": "Loopio / Responsive ($1,000+/mo)",
    "useCases": [
      {
        "who": "Solo consultant",
        "job": "Decide in an afternoon whether an RFP is worth days of unpaid writing."
      },
      {
        "who": "Boutique agency owner",
        "job": "Stop the team chasing RFPs you're unlikely to win, and focus on the ones you can."
      },
      {
        "who": "GovCon business developer",
        "job": "Bring leadership a clear go or skip call, backed by strengths versus the field."
      }
    ],
    "faqs": [
      {
        "q": "What do I get from a Bid / No-Bid Analysis?",
        "a": "You get a clear go or skip call on one RFP, with the reasons behind it. It weighs the RFP against your strengths and the likely competition, flags where you're strong and where you're outmatched, and lays out the trade-offs. One run, one decision you can act on."
      },
      {
        "q": "How is this different from RFP or proposal software?",
        "a": "This answers one question, should you bid at all, before you spend days writing. Tools like Loopio or Responsive help you build and manage the response after you've committed, and run over $1,000 a month. all41 sits earlier and cheaper, so you skip the RFPs that aren't worth chasing in the first place."
      },
      {
        "q": "What does it cost?",
        "a": "About $2 per run, and you only pay when you use it. No subscription, no seat licenses, no annual contract. The price shows before you run, so there's never a surprise. Run it on the RFPs you're weighing and skip the rest."
      },
      {
        "q": "How accurate is the call, and what is it based on?",
        "a": "The call is based on the details you give it, the RFP, your strengths, and what you know about the competition, so the more you put in, the sharper it gets. It's a decision aid, not a guarantee: it surfaces the trade-offs and gives you a reasoned recommendation. The final call stays yours."
      },
      {
        "q": "Can I run it on several RFPs to compare them?",
        "a": "Yes, run it on each RFP you're weighing and compare the calls side by side. At about $2 a run with no subscription, checking five opportunities costs around $10. That's less than the time you'd lose writing one proposal you were never going to win."
      },
      {
        "q": "Who is this for?",
        "a": "It's for consultants, agencies, and contractors who respond to RFPs and can't afford to chase every one. If a losing proposal costs you days of unbilled work, a quick go or skip call pays for itself the first time it talks you out of a bad bid."
      }
    ]
  },
  "proposal-review": {
    "replaces": "Loopio / Responsive RFP software ($1,000+/mo, annual contracts)",
    "useCases": [
      {
        "who": "Solo consultant",
        "job": "Catch the gaps in your RFP response before the client does."
      },
      {
        "who": "Boutique agency owner",
        "job": "Check that your proposal answers every ask in the brief before it goes out."
      },
      {
        "who": "Grant writer",
        "job": "Confirm the proposal covers each requirement while there's still time to fix it."
      }
    ],
    "faqs": [
      {
        "q": "What is Proposal Review?",
        "a": "Proposal Review runs a proposal you already wrote through an evaluator-style compliance check and hands back a gap report before you submit. It reads your draft the way a reviewer would and flags what's missing, weak, or off-brief. You bring the proposal; it gives you a clear list of gaps to fix."
      },
      {
        "q": "How is this different from RFP tools like Loopio or Responsive?",
        "a": "Those platforms help a whole team build and store proposal content on an annual contract, while Proposal Review does one job: checking a finished draft for gaps, one run at a time. There's nothing to set up and no library to manage. You reach for it when a proposal is ready, not to run your pipeline."
      },
      {
        "q": "What does Proposal Review cost?",
        "a": "About $3.5 per run, and you pay only when you run one. No subscription, no seats, no annual contract. You see the price before every run, so there's never a surprise."
      },
      {
        "q": "How accurate is the gap report?",
        "a": "It checks your proposal against the brief and evaluator-style criteria, then shows you where each gap sits. It's a sharp second read, not a promise of a win, so you stay the judge on what to fix. It won't invent a score."
      },
      {
        "q": "What do I need to hand over?",
        "a": "You give it the proposal you wrote and the requirements it's answering. It reviews what you provide, in your own words, and points to the exact spots that need work. Your draft stays your draft."
      },
      {
        "q": "When should I run it?",
        "a": "Run it once your draft is done and before you submit. One run gives you the full gap list in a single pass, so you have time to close the holes before the deadline instead of after."
      }
    ]
  },
  "past-performance-library": {
    "replaces": "Loopio / Responsive ($500–2,000/mo)",
    "useCases": [
      {
        "who": "Boutique strategy consultant",
        "job": "Win more bids by dropping in proof that fits each client, without digging through old files."
      },
      {
        "who": "Agency proposal lead",
        "job": "Answer \"have you done this before?\" with real, tidy examples in minutes."
      },
      {
        "who": "Independent consultant",
        "job": "Turn a decade of past projects into a proof library your next proposal writes from."
      }
    ],
    "faqs": [
      {
        "q": "What does the Past-Performance Library do?",
        "a": "It turns your old proposals and case studies into clean, reusable proof points your future bids pull from. You point it at past work, and it pulls out the wins, numbers, and outcomes worth reusing. Next time you bid, the right proof is already there."
      },
      {
        "q": "How is this different from proposal software like Loopio or PandaDoc?",
        "a": "Those tools store your content and help you build documents; this one reads your past work and builds the proof library for you. You don't set up a system or tag every file by hand. It does the sorting, so your best examples surface when a new bid needs them."
      },
      {
        "q": "How much does it cost?",
        "a": "About $0.6 per run, and you pay only when you use it. No subscription, no seat fees, no annual contract. Run it when a new proposal comes in, and skip it the weeks you don't."
      },
      {
        "q": "Where do the proof points come from?",
        "a": "Every proof point comes straight from your own proposals and case studies, not made-up numbers. It works only from the files you give it, so the wins and figures are yours. You can check each one against its source before it goes in a bid."
      },
      {
        "q": "Can it help me answer \"have you done this before?\" in an RFP?",
        "a": "Yes. It surfaces the past projects that match what the client is asking for, with the outcome and numbers ready to drop in. Instead of hunting through old folders, you get the closest proof in front of you."
      },
      {
        "q": "What do I need to give it to start?",
        "a": "Just your old proposals and case studies, the documents you already have. Drop them in and it builds the library from there. The more past work you add, the more proof it has to pull from."
      }
    ]
  }
};

/** The best "instead of …" line for a slug — the per-page content first, then any sample metadata. */
export function replacesFor(slug: string): string | undefined {
  return APP_PAGE[slug]?.replaces ?? APP_META[slug]?.replaces;
}

/** FAQ items shaped for <FaqAccordion> / FAQPage schema (stable ids for a11y + anchors). */
export function faqItems(slug: string): FaqItem[] {
  return (APP_PAGE[slug]?.faqs ?? []).map((f, i) => ({ id: `${slug}-q${i + 1}`, q: f.q, a: f.a }));
}
