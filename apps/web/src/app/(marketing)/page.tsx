import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { AppGallery } from "@/components/marketing/app-gallery";
import { SolutionCards } from "@/components/marketing/solution-cards";
import { ResultsChat } from "@/components/marketing/results-chat";
import { Eyebrow, H2, N, Section, SectionHead, TextLink } from "@/components/marketing/primitives";
import { toGalleryApp } from "@/content/gallery";
import { getPublishedApps } from "./_lib/data";

export const metadata: Metadata = {
  title: { absolute: "all41 — the AI that does the work, not another AI to learn." },
  description:
    "One place for every job. The right AI does the work — no prompts, no subscription. $2 free, pay only when you use.",
};

const WHY_CARDS = [
  { icon: "check", card: "bg-coral-soft border-coral-soft", k: "Your AI makes things up?", v: "We show the sources. And double-check." },
  { icon: "robot", card: "bg-violet-soft border-violet-soft", k: "Why use one AI when you can use them all?", v: "The best AI for each job, working together. Big results, small cost." },
  { icon: "coins", card: "bg-green-soft border-green-soft", k: "Only pay for what you use.", v: "No hidden cost. No wasted cost. A quiet week is $0." },
];

const JOURNEY: { n: number; tone: "red" | "amber" | "green"; node: string; title: string; body: string; chips: string[] }[] = [
  { n: 1, tone: "red", node: "bg-coral-solid", title: "Say what you need", body: "Pick a tool, or just describe the job.", chips: ["SEO + GEO", "Proposal", "Research", "describe it…"] },
  { n: 2, tone: "amber", node: "bg-amber-solid", title: "Answer a few quick things", body: "Big taps, no forms. One at a time.", chips: ["from this week", "direct tone", "as a report", "double-check it"] },
  { n: 3, tone: "green", node: "bg-green-solid", title: "See the price, then run it", body: "A result with sources. Nothing charged until you say go.", chips: ["≈ $0.004", "today’s best AI"] },
];

export default async function HomePage() {
  const all = await getPublishedApps();
  const apps = all.slice(0, 6);
  const liveCount = all.length;

  return (
    <>
      {/* 1 · HERO — words left, illustrated hero right; light gradient wash + cinematic shine */}
      <Section className="relative pt-10 md:pt-14 pb-16 md:pb-24">
        <div className="absolute -top-36 bottom-0 left-1/2 -translate-x-1/2 w-screen -z-10 overflow-hidden hero-aura" aria-hidden />
        <div className="relative z-10 grid lg:grid-cols-[1.25fr_0.75fr] gap-6 lg:gap-8 items-center">
          <div className="flex flex-col items-start text-left gap-6 max-w-2xl">
          <Link
            href="/apps/seo-geo-optimizer"
            className="rise inline-flex items-center gap-2 rounded-full border border-line bg-bg-elev/70 backdrop-blur pl-1.5 pr-4 py-1.5 text-sm shadow-soft hover:shadow-lift transition"
          >
            <span className="rounded-full bg-coral-solid text-white text-xs font-semibold px-2.5 py-1">New</span>
            <span className="text-fg">SEO + GEO Optimizer is live</span>
            <span className="text-fg-muted" aria-hidden>→</span>
          </Link>
          <p className="rise-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-fg-muted font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber" aria-hidden />
            For anyone who&apos;s done juggling AI tools
          </p>
          <h1 className="rise-1 font-semibold leading-[1.1] tracking-tight">
            <span className="block text-6xl md:text-7xl xl:text-[5rem]">One place.</span>
            <span className="block mt-1 text-4xl md:text-5xl lg:whitespace-nowrap">
              <span className="text-grad">The right AI for any </span>
              <span className="relative inline-block px-[0.55em] py-[0.16em] align-baseline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/scratch.svg" alt="" aria-hidden className="absolute inset-0 h-[130%] w-full -top-[15%] pointer-events-none select-none" />
                <span className="relative italic text-white">job</span>
              </span>
              <span className="text-grad">.</span>
            </span>
          </h1>
          <p className="rise-2 text-lg md:text-xl text-fg-muted max-w-2xl leading-relaxed text-pretty">
            We pick the right AI for the job and do the work —
            <span className="block">so you can focus on what matters.</span>
            <span className="block mt-2 text-fg font-medium">No Prompts · No Subscription · Pay When You Use</span>
          </p>
          <div className="rise-3 flex flex-col sm:flex-row gap-3 justify-start">
            <Link href="/login">
              <Button phase="warm" size="lg" className="w-full sm:w-auto glow-coral sheen">
                Start free — <N>$2</N>, no card
              </Button>
            </Link>
            <a href="#how">
              <Button phase="ghost" size="lg" className="w-full sm:w-auto">See how it works ↓</Button>
            </a>
          </div>
          <p className="rise-4 reflect text-fg-muted text-lg">AI, made easy ✿</p>
          </div>
          <div className="rise-2 relative flex justify-center lg:justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/overwhelm.webp"
              alt="Someone overwhelmed by too many AI tools and subscriptions"
              className="h-[420px] md:h-[560px] xl:h-[700px] w-auto max-w-none select-none"
            />
          </div>
        </div>
      </Section>

      {/* 2 · SOCIAL-PROOF STRIP — honest, build-in-public facts (no fake logos) */}
      <div className="border-y border-line bg-bg-elev/50">
        <div className="w-full lg:w-[80%] max-w-[1280px] mx-auto px-6 py-5">
          <div className="flex flex-col items-center gap-y-2 font-mono text-base text-fg-muted">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1">
              <li>Built in public</li>
              <Sep />
              <li><N>{liveCount}</N> tools live</li>
              <Sep />
              <li>The right AI picked per job</li>
            </ul>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1">
              <li>Every run priced first</li>
              <Sep />
              <li>Quiet week = <N>$0</N></li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3 · IMAGE + WHY CARDS — illustration left, three colourful cards right */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative w-full max-w-xl mx-auto lg:mx-0 order-1">
            <Image
              src="/hero.webp"
              alt="One place where the right AI quietly does every job — a dashboard surrounded by friendly AI helpers."
              width={1100}
              height={1100}
              className="w-full h-auto"
            />
          </div>
          <div className="space-y-6 order-2">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-fg-muted font-semibold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber" aria-hidden />
                Why all41
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold leading-[1.1] max-w-md">The best AI, for every job.</h2>
            </div>
            <div className="space-y-4">
              {WHY_CARDS.map((c) => (
                <div key={c.k} className={cn("flex items-start gap-4 rounded-4 border p-5 shadow-soft lift", c.card)}>
                  <div className="shrink-0 w-14 h-14 rounded-3 grid place-items-center bg-bg-elev border border-line shadow-soft">
                    <Icon name={c.icon} size={30} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-title text-lg font-bold">{c.k}</h3>
                    <p className="text-fg-muted leading-relaxed">{c.v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 4 · HOW IT WORKS — a journey on the left, live results on the right */}
      <Section id="how">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-fg-muted font-semibold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red" aria-hidden />
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold leading-[1.1] max-w-md">Answer a few questions. Get it done.</h2>
            </div>
            <ol className="relative ml-4 border-l-2 border-line pl-8 space-y-9">
              {JOURNEY.map((s) => (
                <li key={s.n} className="relative">
                  <span className={cn("absolute -left-12 -top-1 w-8 h-8 rounded-full grid place-items-center text-white font-title font-bold text-sm shadow-soft", s.node)}>
                    {s.n}
                  </span>
                  <div className="space-y-2">
                    <h3 className="font-title text-xl font-bold">{s.title}</h3>
                    <p className="text-fg-muted leading-relaxed">{s.body}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {s.chips.map((c) => (
                        <span key={c} className={chip(s.tone)}>{c}</span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-fg-muted">It pulls in only what each job needs — sharper, and cheaper.</p>
          </div>
          <ResultsChat />
        </div>
      </Section>

      {/* 4b · WHAT YOU GET DONE — illustrated category cards */}
      <Section>
        <SectionHead phase="neutral" eyebrow="What you get done" title="Three kinds of work. One place." />
        <SolutionCards />
      </Section>

      {/* 5 · TOOLS — a grid of the flagship apps */}
      <Section id="apps">
        <SectionHead phase="green" eyebrow="Tools" title="Ready-made tools for real jobs." />
        {apps.length === 0 ? (
          <p className="text-fg-faint text-center">No tools published yet.</p>
        ) : (
          <AppGallery apps={apps.map(toGalleryApp)} />
        )}
        <p className="text-fg-muted max-w-2xl mx-auto text-center mt-10 leading-relaxed">
          For each job, all41 picks the right AI, gives it only what it needs, and combines the best tools behind the
          scenes — sharper results, no dozen subscriptions, nothing to learn.
        </p>
        <div className="mt-6 text-center">
          <TextLink href="/apps">See all {liveCount} tools</TextLink>
        </div>
      </Section>

      {/* 6 · BENCHMARK PROOF BAND */}
      <Section>
        <div className="rounded-6 glass grad-ring glow-soft p-10 md:p-16 flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
          <Eyebrow phase="red">The proof</Eyebrow>
          <H2>Don&apos;t take our word for it.</H2>
          <p className="text-fg-muted text-lg max-w-xl">
            Every month, independent judges score all41 against regular AI and a professional — blind. We publish it.
          </p>
          <TextLink href="/benchmark">See this month&apos;s benchmark</TextLink>
        </div>
      </Section>

      {/* 7 · PRICING */}
      <Section>
        <div className="rounded-6 glass grad-ring glow-soft p-10 md:p-16 flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
          <Eyebrow phase="green">Pricing</Eyebrow>
          <H2>Top up. Pay per task. That&apos;s it.</H2>
          <p className="text-fg-muted text-lg">No subscription. <N>$2</N> free to start. A quiet week costs nothing.</p>
          <Link href="/login"><Button phase="warm" size="lg" className="glow-coral sheen">Start free</Button></Link>
        </div>
      </Section>

      {/* 8 · FINAL CTA */}
      <Section className="pb-28">
        <div className="relative rounded-6 p-12 md:p-20 text-center flex flex-col items-center gap-6 max-w-3xl mx-auto overflow-hidden">
          <div className="absolute inset-0 -z-10 grad-soft opacity-70" aria-hidden />
          <H2 className="text-4xl md:text-6xl">Try one job. See what comes back.</H2>
          <p className="text-fg-muted text-lg">No card. No setup. <N>$2</N> to spend on real work.</p>
          <Link href="/login"><Button phase="warm" size="lg" className="glow-coral sheen">Start free</Button></Link>
          <p className="reflect text-fg-muted mt-2">The AI does the work. You keep the result.</p>
        </div>
      </Section>
    </>
  );
}

function Sep() {
  return <li className="text-fg-faint select-none" aria-hidden>·</li>;
}

function chip(tone: "red" | "amber" | "green" | "line") {
  const map = {
    red: "border-red/40 bg-coral-soft text-coral",
    amber: "border-amber/40 bg-amber-soft text-amber",
    green: "border-green/40 bg-green-soft text-green",
    line: "border-line text-fg-muted",
  } as const;
  return `squircle rounded-1 border px-3 py-1 text-xs font-mono ${map[tone]}`;
}

