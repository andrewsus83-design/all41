"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { DEMO_EXAMPLES, type DemoExample } from "@/content/demo-results";
import { APP_DECK, fallbackDeck, type AppDeckContent, type FeatureCard } from "@/content/app-deck-content";
import { categoryLabel, costPrefix } from "@/components/build/catalog-copy";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

/* eslint-disable @next/next/no-img-element */

const PAGE_LABELS = ["Cover", "What", "Sample", "Features", "Start"];

/** The full-screen, 5-page cinematic landing for one app. Every page lives in the DOM (for SEO/GEO);
 * left/right arrows, dots, swipe and arrow-keys move between them. Sits between the shell's top chrome
 * (Credit chip) and the bottom dock. */
export function AppDeck({ app }: { app: CatalogApp }) {
  const examples = DEMO_EXAMPLES[app.slug] ?? [];
  const content = APP_DECK[app.slug] ?? fallbackDeck(app.name, app.description);
  const isWeb = app.slug === "web-builder";
  const run = isWeb ? `/a/${app.slug}/create` : `/chat?app=${app.slug}`;
  const ctaLabel = isWeb ? "Create my website →" : "Use now →";
  const ctaShort = isWeb ? "Create →" : "Use now →";

  const [i, setI] = useState(0);
  const [openEx, setOpenEx] = useState<number | null>(null);
  const n = 5;
  const prev = () => setI((p) => Math.max(0, p - 1));
  const next = () => setI((p) => Math.min(n - 1, p + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openEx !== null) return; // modal handles its own keys
      if (e.key === "ArrowRight") setI((p) => Math.min(n - 1, p + 1));
      else if (e.key === "ArrowLeft") setI((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openEx]);

  // swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); }
    touch.current = null;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${app.name} — all41`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: content.geoSummary,
    offers: { "@type": "Offer", price: app.estCostUsd.toFixed(2), priceCurrency: "USD" },
  };

  const pages = [
    <CoverPage key="cover" app={app} content={content} isWeb={isWeb} examples={examples} run={run} ctaLabel={ctaLabel} onSample={() => setI(2)} />,
    <WhatPage key="what" app={app} content={content} />,
    <SamplePage key="sample" app={app} examples={examples} onOpen={(x) => setOpenEx(x)} />,
    <FeaturesPage key="feat" content={content} />,
    <FinalePage key="cta" content={content} run={run} ctaLabel={ctaLabel} />,
  ];

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 z-30 bg-bg flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* top bar — Back + CTA, left of the shell's Credit chip */}
      <div className="shrink-0 h-16 flex items-center justify-between gap-2 pl-5 md:pl-8 pr-40 sm:pr-44 border-b border-line bg-bg/85 backdrop-blur">
        <Link href="/chat" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition whitespace-nowrap shrink-0">← Studio</Link>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-fg-faint num">{PAGE_LABELS[i]} · {i + 1}/{n}</span>
          <Link href={run} className="shrink-0"><Button phase="green" size="sm" className="whitespace-nowrap"><span className="sm:hidden">{ctaShort}</span><span className="hidden sm:inline">{ctaLabel}</span></Button></Link>
        </div>
      </div>

      {/* deck viewport — overflow-clip (not hidden) so focusing an off-track control can't scroll the pager sideways */}
      <div className="relative flex-1 min-h-0 overflow-clip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {pages.map((p, idx) => (
            <section key={idx} aria-hidden={idx !== i} className="w-full h-full shrink-0 overflow-y-auto overscroll-contain" aria-label={`${app.name} — ${PAGE_LABELS[idx]}`}>
              {p}
            </section>
          ))}
        </div>

        {/* left / right arrows — on every page */}
        <DeckArrow dir="left" onClick={prev} disabled={i === 0} />
        <DeckArrow dir="right" onClick={next} disabled={i === n - 1} />

        {/* dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-bg/80 backdrop-blur border border-line px-3 py-1.5 shadow-sm">
          {PAGE_LABELS.map((label, idx) => (
            <button key={label} type="button" onClick={() => setI(idx)} aria-label={`Go to ${label}`} aria-current={idx === i} className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-6 bg-fg" : "w-1.5 bg-line-strong hover:bg-fg-faint")} />
          ))}
        </div>
      </div>

      {openEx !== null && examples[openEx] && <SampleModal example={examples[openEx]} onClose={() => setOpenEx(null)} />}
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function DeckArrow({ dir, onClick, disabled }: { dir: "left" | "right"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={dir === "left" ? "Previous page" : "Next page"}
      className={cn("absolute top-1/2 -translate-y-1/2 z-10 size-11 md:size-12 rounded-full grid place-items-center bg-bg/85 backdrop-blur border border-line-strong text-fg shadow-lift transition hover:bg-bg-elev-2 disabled:opacity-0 disabled:pointer-events-none", dir === "left" ? "left-2 md:left-4" : "right-2 md:right-4")}
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}

function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-h-full flex flex-col justify-center px-6 md:px-10 py-10 pb-24", className)}>{children}</div>;
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-xs uppercase tracking-[0.2em] text-coral font-title font-semibold">{children}</span>;
}

/* ---------------- page 1 · Cover ---------------- */
function CoverPage({ app, content, isWeb, examples, run, ctaLabel, onSample }: { app: CatalogApp; content: AppDeckContent; isWeb: boolean; examples: DemoExample[]; run: string; ctaLabel: string; onSample: () => void }) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[60%] -z-10" style={{ background: "radial-gradient(70% 60% at 50% 0%, var(--green-soft), transparent 72%)" }} />
      <PageShell className="items-center text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <Eyebrow>{app.category ? categoryLabel(app.category) : "all41"}</Eyebrow>
          <h1 className="font-title font-semibold tracking-tight leading-[0.98] text-pretty whitespace-pre-line text-5xl md:text-7xl lg:text-8xl">{content.coverHeadline}</h1>
          <p className="mx-auto max-w-2xl text-lg md:text-2xl text-fg-muted leading-relaxed">{content.coverSub}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
            <Link href={run}><Button phase="green" size="lg" className="glow-coral">{ctaLabel}</Button></Link>
            <button type="button" onClick={onSample} className="squircle rounded-full border border-line-strong px-5 h-12 font-title font-medium text-fg-muted hover:text-fg hover:bg-bg-elev transition">See a sample →</button>
          </div>
          <p className="text-sm text-fg-faint">{costPrefix(app.slug, app.steps)} <Money usd={app.estCostUsd} /> per run · no subscription</p>
        </div>
        <div className="mt-10 w-full">
          {isWeb ? <SiteFan examples={examples} /> : <CoverGlyph app={app} />}
        </div>
      </PageShell>
    </div>
  );
}

function CoverGlyph({ app }: { app: CatalogApp }) {
  return (
    <div className="relative mx-auto grid place-items-center h-40 md:h-52">
      <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(45% 60% at 50% 50%, var(--amber-soft), transparent 70%)" }} />
      <div className="squircle grid place-items-center size-28 md:size-36 rounded-5 bg-bg-elev-2 border border-line shadow-lift text-6xl md:text-7xl leading-none">{app.icon}</div>
    </div>
  );
}

/** Fanned 3D deck of real site previews (web-builder cover). */
function SiteFan({ examples }: { examples: DemoExample[] }) {
  const cards = examples.slice(0, 3).map((e) => {
    const r = e.result as { subdomain?: string; pages?: { image?: string }[]; style?: { palette?: string[] } };
    const brand = (r.subdomain || "site").split(".")[0].split(/[-_]/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
    return { image: (r.pages ?? [])[0]?.image || "/samples/builder-hero.webp", brand, accent: (r.style?.palette ?? [])[1] || "#ff6b5e", label: e.label };
  });
  const t = [{ r: -8, x: -26, y: 16, z: 1, s: 0.92 }, { r: 0, x: 0, y: 0, z: 3, s: 1 }, { r: 8, x: 26, y: 16, z: 1, s: 0.92 }];
  if (cards.length === 0) return null;
  return (
    <div className="relative mx-auto max-w-2xl h-[220px] md:h-[300px]">
      {cards.map((c, idx) => {
        const p = t[idx] ?? t[1];
        return (
          <div key={idx} className="absolute left-1/2 top-0 w-[42%] md:w-[38%]" style={{ transform: `translateX(-50%) translateX(${p.x}%) translateY(${p.y}px) rotate(${p.r}deg) scale(${p.s})`, zIndex: p.z }}>
            <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift bg-white">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-line bg-bg-elev-2"><span className="size-1.5 rounded-full bg-red/50" /><span className="size-1.5 rounded-full bg-amber/50" /><span className="size-1.5 rounded-full bg-green/50" /></div>
              <div className="relative" style={{ aspectRatio: "3/4" }}>
                <img src={c.image} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.62))" }} />
                <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                  <p className="font-title font-semibold text-xs leading-tight" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{c.brand}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: c.accent, color: "#fff" }}>{c.label}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- page 2 · What ---------------- */
function WhatPage({ app, content }: { app: CatalogApp; content: AppDeckContent }) {
  const steps = app.steps ?? [];
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="space-y-5">
          <Eyebrow>What it is</Eyebrow>
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight text-pretty">{content.whatHeading}</h2>
          <p className="text-lg text-fg-muted leading-relaxed">{content.whatBody}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="squircle rounded-full border border-line px-3 py-1 text-sm text-fg-muted">{app.steps.length + 1} steps</span>
            <span className="squircle rounded-full border border-line px-3 py-1 text-sm text-fg-muted"><Money usd={app.estCostUsd} /> per run</span>
            <span className="squircle rounded-full border border-line px-3 py-1 text-sm text-fg-muted">No subscription</span>
          </div>
        </div>
        <div className="squircle rounded-5 border border-line bg-bg-elev p-6 md:p-8">
          <p className="font-title font-medium mb-4">How it works</p>
          <ol className="space-y-3.5">
            {steps.map((s, idx) => (
              <li key={s.id ?? idx} className="flex items-start gap-3.5">
                <span className="grid place-items-center size-7 rounded-full bg-green-soft text-green font-title font-semibold text-sm shrink-0">{idx + 1}</span>
                <p className="pt-0.5 text-pretty">{s.label}</p>
              </li>
            ))}
            <li className="flex items-start gap-3.5">
              <span className="grid place-items-center size-7 rounded-full bg-green-soft text-green font-title font-semibold text-sm shrink-0">{steps.length + 1}</span>
              <p className="pt-0.5 text-fg-muted">Delivered where you choose, and saved in My Apps.</p>
            </li>
          </ol>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------------- page 3 · Sample (banner slides → popup) ---------------- */
function posterFor(slug: string, example: DemoExample): { image?: string; motif: string; ratio: string; tint: string } {
  const r = example.result as { pages?: { image?: string }[] };
  const img = (r.pages ?? [])[0]?.image;
  if (slug === "web-builder") return { image: img, motif: "Website", ratio: "16/10", tint: "var(--green-soft)" };
  const bySchema: Record<string, { motif: string; ratio: string; tint: string }> = {
    content_report: { motif: "Content board", ratio: "1/1", tint: "var(--coral-soft)" },
    proposal_report: { motif: "Proposal · A4", ratio: "3/4", tint: "var(--amber-soft)" },
    clip_report: { motif: "Clip · 9:16", ratio: "9/16", tint: "var(--green-soft)" },
    social_report: { motif: "Dashboard", ratio: "16/10", tint: "var(--coral-soft)" },
    competitor_report: { motif: "Battlecard", ratio: "16/10", tint: "var(--amber-soft)" },
    seo_report: { motif: "Audit plan", ratio: "16/10", tint: "var(--green-soft)" },
  };
  const m = bySchema[example.schema] ?? { motif: "Result", ratio: "16/10", tint: "var(--bg-elev-2)" };
  return { ...m, image: img };
}

function SamplePage({ app, examples, onOpen }: { app: CatalogApp; examples: DemoExample[]; onOpen: (i: number) => void }) {
  const content = APP_DECK[app.slug] ?? fallbackDeck(app.name, app.description);
  const [s, setS] = useState(0);
  const has = examples.length > 0;
  const cur = examples[Math.min(s, Math.max(0, examples.length - 1))];
  const poster = cur ? posterFor(app.slug, cur) : null;

  return (
    <PageShell className="items-center text-center">
      <div className="mx-auto max-w-4xl w-full space-y-6">
        <div className="space-y-2">
          <Eyebrow>Sample</Eyebrow>
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight">{content.sampleHeading}</h2>
          <p className="text-fg-muted text-lg">{content.sampleSub}</p>
        </div>

        {has && cur && poster ? (
          <div className="space-y-4">
            {/* example tabs */}
            {examples.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {examples.map((e, idx) => (
                  <button key={idx} type="button" onClick={() => setS(idx)} className={cn("squircle rounded-full border px-3.5 py-1.5 text-sm font-title font-medium transition", idx === s ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{e.label}</button>
                ))}
              </div>
            )}
            {/* the banner */}
            <button type="button" onClick={() => onOpen(s)} className="group relative block w-full mx-auto squircle rounded-5 overflow-hidden border border-line-strong shadow-lift" style={{ maxWidth: poster.ratio === "9/16" || poster.ratio === "3/4" ? 380 : 760 }}>
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-bg-elev-2"><span className="size-2 rounded-full bg-red/50" /><span className="size-2 rounded-full bg-amber/50" /><span className="size-2 rounded-full bg-green/50" /><span className="ml-2 text-xs text-fg-faint">{poster.motif}</span></div>
              <div className="relative" style={{ aspectRatio: poster.ratio, background: poster.tint }}>
                {poster.image ? (
                  <img src={poster.image} alt={cur.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center"><span className="text-7xl opacity-60">{app.icon}</span></div>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition grid place-items-center" style={{ background: "rgba(0,0,0,0.35)" }}>
                  <span className="squircle rounded-full bg-bg text-fg font-title font-medium px-5 py-2.5 shadow-lift">Open full experience →</span>
                </div>
              </div>
            </button>
            {/* dots */}
            {examples.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                {examples.map((e, idx) => <button key={idx} type="button" onClick={() => setS(idx)} aria-label={`Sample ${idx + 1}`} className={cn("h-1.5 rounded-full transition-all", idx === s ? "w-6 bg-fg" : "w-1.5 bg-line-strong")} />)}
              </div>
            )}
            <p className="text-sm text-fg-faint">Tap the banner to open the full-screen experience — real demo data, nothing charged.</p>
          </div>
        ) : (
          <div className="squircle rounded-5 border border-dashed border-line bg-bg-elev p-12 text-fg-muted">A sample is on the way for this app.</div>
        )}
      </div>
    </PageShell>
  );
}

function SampleModal({ example, onClose }: { example: DemoExample; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = ""; };
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] bg-bg flex flex-col scene-in" role="dialog" aria-modal="true" aria-label={`${example.label} — full sample`}>
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 h-14 border-b border-line bg-bg-elev">
        <span className="font-title font-medium truncate">{example.label}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="size-10 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition text-lg shrink-0">✕</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <ResultView output={example.result} schema={example.schema} isMock />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- page 4 · Features ---------------- */
function FeaturesPage({ content }: { content: AppDeckContent }) {
  const feats = content.features;
  return (
    <PageShell className="items-center text-center">
      <div className="mx-auto max-w-5xl w-full space-y-8">
        <div className="space-y-2">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-title text-3xl md:text-5xl font-semibold tracking-tight">A specialist crew, step by step</h2>
        </div>
        {feats.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {feats.map((f, idx) => (
              <div key={idx} className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
                <span className="grid place-items-center size-9 rounded-full bg-green-soft text-green font-title font-semibold">{idx + 1}</span>
                <p className="text-pretty leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-fg-muted">A multi-step specialist crew runs each stage, then verifies the result.</p>
        )}
      </div>
    </PageShell>
  );
}

/* ---------------- page 5 · Features II + CTA ---------------- */
function FinalePage({ content, run, ctaLabel }: { content: AppDeckContent; run: string; ctaLabel: string }) {
  return (
    <PageShell className="items-center text-center">
      <div className="mx-auto max-w-5xl w-full space-y-6 md:space-y-8">
        <div className="space-y-1.5">
          <Eyebrow>Why all41</Eyebrow>
          <h2 className="font-title text-2xl md:text-4xl font-semibold tracking-tight">What makes it different</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-left">
          {content.featuresII.map((f: FeatureCard, idx) => (
            <div key={idx} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-1.5">
              <p className="font-title font-medium">{f.title}</p>
              <p className="text-sm text-fg-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="squircle rounded-5 bg-fg text-bg p-7 md:p-10 space-y-4">
          <h3 className="font-title text-2xl md:text-4xl font-semibold tracking-tight leading-[1.05]" style={{ color: "var(--bg)" }}>{content.ctaHeadline}</h3>
          <p className="text-bg/70 text-base md:text-lg max-w-xl mx-auto">{content.ctaSub}</p>
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">{ctaLabel}</Button></Link>
        </div>
      </div>
    </PageShell>
  );
}
