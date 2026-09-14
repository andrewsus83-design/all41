"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WebsiteReport } from "@/components/apps/website-report";
import { DEMO_EXAMPLES } from "@/content/demo-results";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

/* eslint-disable @next/next/no-img-element */

type Card = { image: string; brand: string; accent: string; sub: string; industry: string };
function cardsFrom(): Card[] {
  const ex = DEMO_EXAMPLES["web-builder"] ?? [];
  const industry = ["Local services", "Coffee & food", "Coaching"];
  return ex.map((e, i) => {
    const r = e.result as { subdomain?: string; pages?: { image?: string; subhead?: string }[]; style?: { palette?: string[] } };
    const brand = (r.subdomain || "your-brand").split(".")[0].split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const page = (r.pages ?? [])[0] ?? {};
    return { image: page.image || "/samples/builder-hero.webp", brand, accent: (r.style?.palette ?? [])[1] || "#ff6b5e", sub: (page.subhead || "").slice(0, 60), industry: industry[i] || e.label };
  });
}

/** The signature Wix visual — a fanned 3D deck of real site previews. */
function SiteFan({ cards }: { cards: Card[] }) {
  const t = [{ r: -8, x: -26, y: 22, z: 1, s: 0.92 }, { r: 0, x: 0, y: 0, z: 3, s: 1 }, { r: 8, x: 26, y: 22, z: 1, s: 0.92 }];
  return (
    <div className="relative mx-auto max-w-3xl h-[300px] sm:h-[420px]">
      {cards.slice(0, 3).map((c, i) => {
        const p = t[i] ?? t[1];
        return (
          <div key={i} className="absolute left-1/2 top-0 w-[46%] sm:w-[42%]" style={{ transform: `translateX(-50%) translateX(${p.x}%) translateY(${p.y}px) rotate(${p.r}deg) scale(${p.s})`, zIndex: p.z }}>
            <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift bg-white">
              <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-line bg-bg-elev-2">
                <span className="size-1.5 rounded-full bg-red/50" /><span className="size-1.5 rounded-full bg-amber/50" /><span className="size-1.5 rounded-full bg-green/50" />
              </div>
              <div className="relative" style={{ aspectRatio: "3/4" }}>
                <img src={c.image} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.6))" }} />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="font-title font-semibold text-sm leading-tight" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{c.brand}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: c.accent, color: "#fff" }}>{c.industry}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
        <ul className="space-y-2 pt-1">{points.map((p, i) => <li key={i} className="flex gap-2.5 text-fg"><span className="text-green shrink-0 font-semibold">✓</span>{p}</li>)}</ul>
      </div>
      <div className={cn("squircle rounded-5 overflow-hidden border border-line-strong shadow-lift", flip && "lg:[direction:ltr]")}>
        <img src={src} alt={title} style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      </div>
    </div>
  );
}

/** Flagship, Wix-caliber landing for Web Builder — bold centered hero, fanned deck, industry tabs. */
export function WebBuilderLanding({ app }: { app: CatalogApp }) {
  const examples = DEMO_EXAMPLES["web-builder"] ?? [];
  const [ex, setEx] = useState(0);
  const cur = examples[Math.min(ex, Math.max(0, examples.length - 1))];
  const run = `/a/${app.slug}/create`;
  const cards = cardsFrom();
  const industries = ["Local services", "Coffee & food", "Coaching", "Ecommerce", "Portfolio", "Restaurants"];

  return (
    <div className="pb-24">
      {/* nav */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between gap-3 py-5">
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Studio</Link>
        <Link href={run}><Button phase="green" size="sm">Create my website →</Button></Link>
      </div>

      {/* HERO — bold, centered, device fan below */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[520px] -z-10" style={{ background: "radial-gradient(60% 60% at 50% 0%, var(--green-soft), transparent 70%)" }} />
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-10 pb-8 text-center space-y-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-title font-semibold tracking-tight leading-[0.98] text-pretty">Describe it.<br />We build it.</h1>
          <p className="text-lg md:text-2xl text-fg-muted leading-relaxed max-w-2xl mx-auto">Answer a few questions — a specialist crew builds you a live, conversion-optimized, SEO-ready website, hosted at your own address.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
            <a href="#showcase"><Button phase="ghost" size="lg">See real sites ↓</Button></a>
          </div>
          <p className="text-sm text-fg-faint">No design skills · pay per use · no monthly bill</p>
        </div>
        <div className="px-5 pb-12"><SiteFan cards={cards} /></div>
      </section>

      {/* TRUST STRIP */}
      <div className="border-y border-line bg-bg-elev">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[["Live in minutes", "not weeks"], ["SEO + AI-search", "baked in"], ["Your own address", "yourname.all41.app"], ["Pay per use", "no subscription"]].map(([a, b]) => (
            <div key={a}><p className="font-title font-semibold">{a}</p><p className="text-xs text-fg-faint">{b}</p></div>
          ))}
        </div>
      </div>

      {/* NATURAL CREATION */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <FeatureRow
          eyebrow="As natural as describing it"
          title="No editor. No templates to fight."
          body="Wix hands you an editor and a blank canvas. all41 hands you a finished site. Tell the crew about your business in plain words — it makes every call a designer and copywriter would."
          points={["A brand profile from your answers — no design skills", "Conversion copy written for you, not lorem ipsum", "A clean, mobile-first, multi-page layout picked for your business"]}
          src="/samples/builder-office.webp"
        />
      </section>

      {/* INDUSTRY SHOWCASE — templates for any industry */}
      {cur && (
        <section id="showcase" className="bg-bg-elev border-y border-line scroll-mt-6">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20">
            <div className="text-center mb-8 space-y-2">
              <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight">A site for any business</h2>
              <p className="text-fg-muted text-lg">Real examples — click through the pages, or open the full site.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {industries.map((c, i) => <button key={c} type="button" onClick={() => i < examples.length && setEx(i)} className={cn("squircle rounded-full border px-3.5 py-1.5 text-sm font-title font-medium transition", i === ex ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{c}</button>)}
            </div>
            <div key={ex} className="slide-fade"><WebsiteReport report={cur.result} isMock /></div>
          </div>
        </section>
      )}

      {/* FOUND EVERYWHERE */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <FeatureRow
          flip
          eyebrow="Found on Google AND AI"
          title="Built to be found — and to convert"
          body="Every site ships with the SEO and GEO groundwork agencies charge thousands for: schema, meta, sitemaps, and self-contained answers AI engines can quote — plus a layout designed on conversion best-practice."
          points={["Schema, meta and sitemaps generated automatically", "Quotable by ChatGPT, Perplexity and Google AI Overviews", "One clear CTA, proof placed where it works, mobile-first"]}
          src="/samples/builder-cafe.webp"
        />
      </section>

      {/* WHAT IT REPLACES */}
      <section className="bg-bg-elev border-y border-line">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight text-center mb-3">What it replaces</h2>
          <p className="text-fg-muted text-lg text-center mb-10 max-w-xl mx-auto">A website builder plus an SEO agency plus a hosting bill — in one pay-per-use run.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="squircle rounded-5 border border-line bg-bg p-7 space-y-3">
              <p className="font-title text-lg font-medium text-fg-muted">The old way</p>
              <ul className="space-y-2 text-fg-muted">
                {[["Website builder", "$16–49/mo"], ["SEO agency", "$1–3k/mo"], ["Copywriter", "$500+"], ["Hosting", "$10–30/mo"]].map(([a, b]) => <li key={a} className="flex justify-between gap-3"><span>{a}</span><span className="num">{b}</span></li>)}
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
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 pt-16 text-center">
        <div className="squircle rounded-5 bg-fg text-bg p-10 md:p-16 space-y-5">
          <h2 className="font-title text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">Your website is a<br className="hidden sm:block" /> few answers away.</h2>
          <p className="text-bg/70 text-lg max-w-xl mx-auto">Build it once, see it live, and only pay when it actually runs.</p>
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">Create my website →</Button></Link>
        </div>
      </section>
    </div>
  );
}
