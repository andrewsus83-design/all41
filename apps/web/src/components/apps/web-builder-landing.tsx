"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WebsiteReport } from "@/components/apps/website-report";
import { DEMO_EXAMPLES } from "@/content/demo-results";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

const STEPS = [
  { n: "1", t: "Answer a few questions", d: "Your brand, what you do, who it's for, your colors — 60 seconds, no design skills." },
  { n: "2", t: "A specialist crew designs it", d: "Conversion copy, a clean multi-page layout, your palette and fonts — with SEO and AI-search baked in." },
  { n: "3", t: "Live at yourname.all41.app", d: "Published and hosted at your own address, ready to share. Care on credits — no monthly subscription." },
];

/* eslint-disable @next/next/no-img-element */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="squircle rounded-5 overflow-hidden border border-line-strong shadow-lift bg-bg-elev">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-elev-2">
        <span className="size-2.5 rounded-full bg-red/50" /><span className="size-2.5 rounded-full bg-amber/50" /><span className="size-2.5 rounded-full bg-green/50" />
        <span className="mx-auto text-xs text-fg-faint num">yourname.all41.app</span>
      </div>
      <img src={src} alt={alt} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    </div>
  );
}

function FeatureRow({ eyebrow, title, body, points, src, flip }: { eyebrow: string; title: string; body: string; points: string[]; src: string; flip?: boolean }) {
  return (
    <div className={cn("grid lg:grid-cols-2 gap-8 lg:gap-14 items-center", flip && "lg:[direction:rtl]")}>
      <div className={cn("space-y-4", flip && "lg:[direction:ltr]")}>
        <span className="text-xs uppercase tracking-widest text-coral font-title font-semibold">{eyebrow}</span>
        <h3 className="font-title text-3xl md:text-4xl font-semibold tracking-tight text-pretty">{title}</h3>
        <p className="text-lg text-fg-muted leading-relaxed">{body}</p>
        <ul className="space-y-2 pt-1">
          {points.map((p, i) => <li key={i} className="flex gap-2.5 text-fg"><span className="text-green shrink-0 font-semibold">✓</span>{p}</li>)}
        </ul>
      </div>
      <div className={cn(flip && "lg:[direction:ltr]")}><Shot src={src} alt={title} /></div>
    </div>
  );
}

/** Flagship, Wix-caliber landing for Web Builder — adapted to all41's design system. */
export function WebBuilderLanding({ app }: { app: CatalogApp }) {
  const examples = DEMO_EXAMPLES["web-builder"] ?? [];
  const [ex, setEx] = useState(0);
  const cur = examples[Math.min(ex, Math.max(0, examples.length - 1))];
  const run = `/chat?app=${app.slug}`;
  const industries = ["Local services", "Coffee & food", "Coaching", "Ecommerce", "Portfolio", "Restaurants"];

  return (
    <div className="pb-24">
      {/* nav */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between gap-3 py-5">
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Studio</Link>
        <Link href={run}><Button phase="green" size="sm">Create my website →</Button></Link>
      </div>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-8 pb-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 squircle rounded-full bg-coral-soft text-coral px-3 py-1.5 text-xs font-title font-semibold">✦ Web Builder</span>
          <h1 className="text-5xl md:text-7xl font-title font-semibold tracking-tight leading-[1.02] text-pretty">Describe it.<br />We build it.</h1>
          <p className="text-lg md:text-xl text-fg-muted leading-relaxed max-w-lg">Answer a few questions and a specialist crew builds you a live, conversion-optimized, SEO-ready website — hosted at your own <span className="num text-fg">yourname.all41.app</span>. No editor to learn. No monthly bill.</p>
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
            <a href="#showcase"><Button phase="ghost" size="lg">See real sites ↓</Button></a>
          </div>
        </div>
        <div className="rotate-[0.5deg]"><Shot src="/samples/builder-hero.webp" alt="A website built with all41" /></div>
      </section>

      {/* TRUST STRIP */}
      <div className="border-y border-line bg-bg-elev">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[["Live in minutes", "not weeks"], ["SEO + AI-search", "baked in"], ["Your own address", "yourname.all41.app"], ["Pay per use", "no subscription"]].map(([a, b]) => (
            <div key={a}><p className="font-title font-semibold">{a}</p><p className="text-xs text-fg-faint">{b}</p></div>
          ))}
        </div>
      </div>

      {/* SECTION 1 — natural creation */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <FeatureRow
          eyebrow="As natural as describing it"
          title="No editor. No templates to fight."
          body="Wix hands you an editor and a blank canvas. all41 hands you a finished site. Tell the crew about your business in plain words — it makes every decision a designer and copywriter would."
          points={["A brand profile from your answers — no design skills needed", "Conversion copy written for you, not lorem ipsum", "A clean, mobile-first, multi-page layout picked for your business"]}
          src="/samples/builder-office.webp"
        />
      </section>

      {/* INDUSTRY SHOWCASE */}
      {cur && (
        <section id="showcase" className="bg-bg-elev border-y border-line scroll-mt-6">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20">
            <div className="text-center mb-8 space-y-2">
              <h2 className="font-title text-3xl md:text-4xl font-semibold tracking-tight">A site for any business</h2>
              <p className="text-fg-muted text-lg">Real examples — click through the pages, or open the full site.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {industries.map((c) => <span key={c} className="squircle rounded-full border border-line bg-bg px-3 py-1.5 text-sm text-fg-muted">{c}</span>)}
            </div>
            {examples.length > 1 && (
              <div className="flex items-center gap-2 justify-center overflow-x-auto pb-4 -mx-1 px-1">
                {examples.map((e, i) => (
                  <button key={i} type="button" onClick={() => setEx(i)} className={cn("shrink-0 px-4 py-2 rounded-full text-sm font-title font-medium transition border", i === ex ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{e.label}</button>
                ))}
              </div>
            )}
            <div key={ex} className="slide-fade"><WebsiteReport report={cur.result} isMock /></div>
          </div>
        </section>
      )}

      {/* SECTION 2 — found everywhere */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <FeatureRow
          flip
          eyebrow="Found on Google AND AI"
          title="Built to be found — and to convert"
          body="Every site ships with the SEO and GEO groundwork agencies charge thousands for: schema, meta, sitemaps, and self-contained answers AI engines can quote — plus a layout designed on conversion best-practice, not just looks."
          points={["Schema, meta and sitemaps generated automatically", "Quotable by ChatGPT, Perplexity and Google AI Overviews", "One clear CTA, proof placed where it works, mobile-first"]}
          src="/samples/builder-cafe.webp"
        />
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-bg-elev border-y border-line">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="font-title text-3xl md:text-4xl font-semibold tracking-tight text-center mb-10">From idea to live site in three steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="space-y-3">
                <span className="grid place-items-center size-11 rounded-full bg-green-soft text-green font-title text-lg font-semibold">{s.n}</span>
                <p className="font-title text-xl font-medium">{s.t}</p>
                <p className="text-fg-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IT REPLACES — honest social proof */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <h2 className="font-title text-3xl md:text-4xl font-semibold tracking-tight text-center mb-3">What it replaces</h2>
        <p className="text-fg-muted text-lg text-center mb-10 max-w-xl mx-auto">The job of a website builder plus an SEO agency plus a hosting bill — in one pay-per-use run.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="squircle rounded-5 border border-line bg-bg-elev p-7 space-y-3">
            <p className="font-title text-lg font-medium text-fg-muted">The old way</p>
            <ul className="space-y-2 text-fg-muted">
              <li className="flex justify-between gap-3"><span>Website builder</span><span className="num">$16–49/mo</span></li>
              <li className="flex justify-between gap-3"><span>SEO agency</span><span className="num">$1–3k/mo</span></li>
              <li className="flex justify-between gap-3"><span>Copywriter</span><span className="num">$500+</span></li>
              <li className="flex justify-between gap-3"><span>Hosting</span><span className="num">$10–30/mo</span></li>
              <li className="flex justify-between gap-3 pt-2 border-t border-line font-medium text-fg"><span>Every month</span><span className="num">$1,500+</span></li>
            </ul>
          </div>
          <div className="squircle rounded-5 border-2 border-green/40 bg-green-soft p-7 space-y-3">
            <p className="font-title text-lg font-medium text-green">The all41 way</p>
            <ul className="space-y-2 text-fg">
              <li className="flex gap-2"><span className="text-green">✓</span>Site + copy + SEO + hosting, together</li>
              <li className="flex gap-2"><span className="text-green">✓</span>Live at your own address in minutes</li>
              <li className="flex gap-2"><span className="text-green">✓</span>Care on credits — only when it runs</li>
              <li className="flex justify-between gap-3 pt-2 border-t border-green/20 font-medium"><span>Per build</span><span className="num text-green">≈ $6</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 pt-4 pb-8 text-center">
        <div className="squircle rounded-5 bg-fg text-bg p-10 md:p-16 space-y-5">
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight">Your website is a few answers away.</h2>
          <p className="text-bg/70 text-lg max-w-xl mx-auto">Build it once, see it live, and only pay when it actually runs.</p>
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
        </div>
      </section>
    </div>
  );
}
