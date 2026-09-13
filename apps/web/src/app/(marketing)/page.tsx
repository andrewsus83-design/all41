import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { LiveBriefingDemo } from "@/components/marketing/live-briefing-demo";
import { AppCard } from "@/components/marketing/app-card";
import { HeroBlueprint } from "@/components/marketing/hero-blueprint";
import { Sparkles } from "@/components/marketing/sparkles";
import { Eyebrow, H2, N, Section, SectionHead, TextLink } from "@/components/marketing/primitives";
import { APP_META } from "@/content/apps";
import { getPublishedApps } from "./_lib/data";

export const metadata: Metadata = {
  title: { absolute: "all41 — the AI that does the work, not another AI to learn." },
  description: "Tell us the job — the right AI does it. No prompts, no keys, no subscription. Pay only when you use. Start free with $2.",
};

export default async function HomePage() {
  const apps = (await getPublishedApps()).slice(0, 8);

  return (
    <>
      {/* 1 · HERO */}
      <Section className="relative pt-24 md:pt-32 pb-16 md:pb-20 blueprint-grid">
        <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen -z-10 pointer-events-none overflow-hidden">
          <HeroBlueprint />
        </div>
        <Sparkles />
        <div className="flex flex-col items-center text-center gap-7 max-w-4xl mx-auto">
          <div className="rise">
            <Link href="/apps/seo-geo-optimizer" className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elev/70 backdrop-blur pl-1.5 pr-4 py-1.5 text-sm shadow-soft hover:shadow-lift transition">
              <span className="rounded-full bg-coral-solid text-white text-xs font-semibold px-2.5 py-1">New</span>
              <span className="text-fg">SEO + GEO Optimizer is live</span>
              <span className="text-fg-muted" aria-hidden>→</span>
            </Link>
          </div>
          <h1 className="rise-1 text-6xl md:text-7xl xl:text-8xl font-semibold leading-[1.0] tracking-tight text-balance">
            Tell us the job.
            <br />
            <span className="text-grad">Get it done.</span>
          </h1>
          <p className="rise-2 text-lg md:text-2xl text-fg-muted max-w-2xl leading-relaxed text-pretty">
            The right AI for the work — no learning, no juggling, no subscription. Pay only when you use.
          </p>
          <div className="rise-3 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button phase="warm" size="lg" className="w-full sm:w-auto glow-coral sheen">Start free — <N>$2</N>, no card</Button>
            </Link>
            <a href="#apps">
              <Button phase="ghost" size="lg" className="w-full sm:w-auto">See what it does ↓</Button>
            </a>
          </div>
          <p className="rise-4 reflect text-fg-muted">pay only when you use ✿</p>
        </div>
        {/* live demo, centered in a premium glass frame */}
        <div className="rise-2 relative mx-auto mt-16 md:mt-20 w-full max-w-xl">
          <div className="absolute -inset-10 -z-10 glow-soft rounded-6" aria-hidden />
          <div className="grad-ring rounded-5 lift">
            <LiveBriefingDemo />
          </div>
        </div>
      </Section>

      {/* 2 · THREE CARDS */}
      <Section>
        <SectionHead phase="amber" eyebrow="Why all41" title="The best AI, for every job." />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { dot: "bg-coral-solid", k: "Your AI makes things up?", v: "We show the sources. And double-check." },
            { dot: "bg-violet-solid", k: "Why use one AI when you can use them all?", v: "The best AI for each job, working together. Big results, small cost." },
            { dot: "bg-green-solid", k: "Only pay for what you use.", v: "No hidden cost. No wasted cost. A quiet week is $0." },
          ].map((c) => (
            <Card key={c.k} className="flex flex-col items-center text-center gap-3 p-8 glass grad-ring lift">
              <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} aria-hidden />
              <CardTitle className="text-2xl">{c.k}</CardTitle>
              <p className="text-fg-muted leading-relaxed max-w-sm">{c.v}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* 3 · APPS */}
      <Section id="apps">
        <SectionHead phase="green" eyebrow="Apps" title="Ready-made tools. Just answer a few questions." />
        {apps.length === 0 ? (
          <p className="text-fg-faint text-center">No apps published yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {apps.map((a) => (
              <AppCard key={a.id} app={a} replaces={APP_META[a.slug]?.replaces} />
            ))}
          </div>
        )}
        <p className="text-fg-muted max-w-2xl mx-auto text-center mt-10 leading-relaxed">
          For each job, all41 picks the right AI, gives it only what it needs, and combines the best tools behind the scenes — sharper results, no dozen subscriptions, nothing to learn.
        </p>
        <div className="mt-6 text-center">
          <TextLink href="/apps">See all tools</TextLink>
        </div>
      </Section>

      {/* 4 · PRICING */}
      <Section>
        <div className="rounded-6 glass grad-ring glow-soft p-10 md:p-16 flex flex-col items-center text-center gap-4 max-w-3xl mx-auto">
          <Eyebrow phase="green">Pricing</Eyebrow>
          <H2>Top up. Pay per task. That&apos;s it.</H2>
          <p className="text-fg-muted text-lg">No subscription. A quiet week costs nothing.</p>
          <Link href="/login"><Button phase="warm" size="lg" className="glow-coral sheen">Start free</Button></Link>
        </div>
      </Section>

      {/* 5 · START */}
      <Section className="pb-28">
        <div className="relative rounded-6 p-12 md:p-20 text-center flex flex-col items-center gap-6 max-w-3xl mx-auto overflow-hidden">
          <div className="absolute inset-0 -z-10 grad-soft opacity-70" aria-hidden />
          <H2 className="text-4xl md:text-6xl">Try one job. See what comes back.</H2>
          <p className="text-fg-muted text-lg">No card. No setup. <N>$2</N> free.</p>
          <Link href="/login"><Button phase="warm" size="lg" className="glow-coral sheen">Start free</Button></Link>
          <p className="reflect text-fg-muted mt-2">The AI does the work. You keep the result.</p>
        </div>
      </Section>
    </>
  );
}
