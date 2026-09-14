"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { WebsiteReport } from "@/components/apps/website-report";
import { DEMO_EXAMPLES } from "@/content/demo-results";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

const STEPS = [
  { n: "1", t: "Answer a few quick questions", d: "Your brand, what you do, who it's for, your colors — 60 seconds, no design skills." },
  { n: "2", t: "A specialist crew designs it", d: "Conversion copy, a clean multi-page layout, your palette and fonts — SEO and AI-search baked in." },
  { n: "3", t: "Live at yourname.all41.app", d: "Published and hosted at your own address, ready to share. Care on credits — no monthly subscription." },
];
const FEATURES = [
  { icon: "📈", t: "SEO & GEO baked in", d: "Schema, meta, sitemaps and self-contained answers so Google — and ChatGPT, Perplexity, AI Overviews — can find and cite you." },
  { icon: "🎯", t: "Built to convert", d: "One clear CTA, mobile-first, proof placed where it works. Designed on conversion best-practice, not just aesthetics." },
  { icon: "🌐", t: "Hosted for you", d: "Live at yourname.all41.app the moment it's done — nothing to configure, no separate host to pay." },
  { icon: "💳", t: "No subscription", d: "The job Wix + an SEO agency do, pay-per-use. Build once, care on credits — never a monthly bill." },
];

/** A flagship, modern landing page for Web Builder — makes you want to build a site with all41. */
export function WebBuilderLanding({ app }: { app: CatalogApp }) {
  const examples = DEMO_EXAMPLES["web-builder"] ?? [];
  const [ex, setEx] = useState(0);
  const cur = examples[Math.min(ex, Math.max(0, examples.length - 1))];
  const run = `/chat?app=${app.slug}`;

  return (
    <div className="pb-24">
      {/* nav */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between gap-3 py-5">
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Studio</Link>
        <span className="text-sm text-fg-faint font-title">Websites</span>
      </div>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-8 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 squircle rounded-full bg-coral-soft text-coral px-3 py-1.5 text-xs font-title font-semibold">✦ Web Builder</span>
          <h1 className="text-4xl md:text-6xl font-title font-semibold tracking-tight leading-[1.05] text-pretty">Describe your brand.<br />Get a website that converts.</h1>
          <p className="text-lg md:text-xl text-fg-muted leading-relaxed max-w-lg">A specialist crew turns a few answers into a live, conversion-optimized, SEO-ready website — hosted at your own <span className="num text-fg">yourname.all41.app</span>. No design skills, no subscription.</p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
            <a href="#showcase"><Button phase="ghost" size="lg">See real sites ↓</Button></a>
          </div>
          <div className="flex items-center gap-x-5 gap-y-1 text-sm text-fg-faint num flex-wrap pt-1">
            <span>{"≈"} <Money usd={app.estCostUsd} /> per build</span><span aria-hidden>·</span>
            <span>Live in minutes</span><span aria-hidden>·</span><span>No monthly fee</span>
          </div>
        </div>
        {/* hero visual — a browser-framed lifestyle shot */}
        <div className="squircle rounded-5 overflow-hidden border border-line-strong shadow-lift bg-bg-elev rotate-[0.6deg]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-elev-2">
            <span className="size-2.5 rounded-full bg-red/50" /><span className="size-2.5 rounded-full bg-amber/50" /><span className="size-2.5 rounded-full bg-green/50" />
            <span className="mx-auto text-xs text-fg-faint num">yourname.all41.app</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/samples/builder-hero.webp" alt="A website built with all41" style={{ width: "100%", height: 360, objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-bg-elev border-y border-line">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16">
          <h2 className="font-title text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">From idea to live site in three steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="space-y-3">
                <span className="grid place-items-center size-10 rounded-full bg-green-soft text-green font-title font-semibold">{s.n}</span>
                <p className="font-title text-lg font-medium">{s.t}</p>
                <p className="text-fg-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE — real sites you could make */}
      {cur && (
        <section id="showcase" className="max-w-5xl mx-auto px-5 md:px-8 py-16 scroll-mt-6">
          <div className="text-center mb-8 space-y-2">
            <h2 className="font-title text-2xl md:text-3xl font-semibold tracking-tight">Real sites, made from a few answers</h2>
            <p className="text-fg-muted">Click through the pages — or open the full site experience.</p>
          </div>
          {examples.length > 1 && (
            <div className="flex items-center gap-2 justify-center overflow-x-auto pb-4 -mx-1 px-1">
              {examples.map((e, i) => (
                <button key={i} type="button" onClick={() => setEx(i)} className={cn("shrink-0 px-4 py-2 rounded-full text-sm font-title font-medium transition border", i === ex ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{e.label}</button>
              ))}
            </div>
          )}
          <div key={ex} className="slide-fade"><WebsiteReport report={cur.result} isMock /></div>
        </section>
      )}

      {/* FEATURES */}
      <section className="bg-bg-elev border-y border-line">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-16">
          <h2 className="font-title text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">Everything a $10k agency build gives you</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.t} className="squircle rounded-4 border border-line bg-bg p-6 flex gap-4">
                <span className="text-3xl leading-none shrink-0">{f.icon}</span>
                <div className="space-y-1"><p className="font-title text-lg font-medium">{f.t}</p><p className="text-sm text-fg-muted leading-relaxed">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 text-center">
        <div className="squircle rounded-5 bg-fg text-bg p-10 md:p-16 space-y-5">
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight">Your website is a few answers away.</h2>
          <p className="text-bg/70 text-lg max-w-xl mx-auto">Build it once, see it live, and only pay when it actually runs.</p>
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
        </div>
      </section>
    </div>
  );
}
