"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { DEMO_EXAMPLES } from "@/content/demo-results";
import { autonomyLine, categoryLabel, costPrefix, whoFor } from "@/components/build/catalog-copy";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

/** A full, attractive landing page for one app — hero, how it works, live sample gallery, CTA. */
export function AppLanding({ app }: { app: CatalogApp }) {
  const examples = DEMO_EXAMPLES[app.slug] ?? [];
  const [ex, setEx] = useState(0);
  const cur = examples[Math.min(ex, Math.max(0, examples.length - 1))];
  const cost = costPrefix(app.slug, app.steps);
  const run = `/chat?app=${app.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-8 pb-24">
      {/* top nav */}
      <div className="flex items-center justify-between gap-3 py-5">
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Studio</Link>
        <span className="text-sm text-fg-faint font-title">{app.category ? categoryLabel(app.category) : "all41"}</span>
      </div>

      {/* hero */}
      <header className="text-center space-y-6 pt-8 pb-14 max-w-2xl mx-auto">
        <span className="grid place-items-center size-24 mx-auto rounded-4 bg-bg-elev-2 text-6xl leading-none shadow-sm">{app.icon}</span>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-title font-semibold tracking-tight text-pretty">{app.name}</h1>
          <p className="text-lg md:text-xl text-fg-muted leading-relaxed text-pretty">{app.description}</p>
        </div>
        {!app.isCustom && <p className="reflect text-fg text-xl md:text-2xl leading-snug">{whoFor(app.slug, app.whoFor)}</p>}
        <div className="flex items-center justify-center gap-2 text-sm text-fg-faint num flex-wrap">
          {app.category && <><span>{categoryLabel(app.category)}</span><span aria-hidden>·</span></>}
          <span>{cost} <Money usd={app.estCostUsd} /> per run</span>
          <span aria-hidden>·</span>
          <span>{app.steps.length + 1} steps</span>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">Use now →</Button></Link>
          {examples.length > 0 && <a href="#samples"><Button phase="ghost" size="lg">See {examples.length > 1 ? "the samples" : "a sample"} ↓</Button></a>}
        </div>
        <p className="text-xs text-fg-faint">Runs once so you can see the real thing — you only pay when it actually runs.</p>
      </header>

      {/* how it works */}
      {app.steps.length > 0 && (
        <section className="py-12 border-t border-line">
          <h2 className="font-title text-2xl md:text-3xl font-semibold tracking-tight text-center mb-8">How it works</h2>
          <ol className="max-w-2xl mx-auto space-y-4">
            {app.steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-4">
                <span className="grid place-items-center size-8 rounded-full bg-green-soft text-green font-title font-semibold shrink-0">{i + 1}</span>
                <p className="text-lg pt-0.5">{s.label}{s.when && <span className="text-sm text-fg-faint"> — only if you ask for fresh information</span>}</p>
              </li>
            ))}
            <li className="flex items-start gap-4">
              <span className="grid place-items-center size-8 rounded-full bg-green-soft text-green font-title font-semibold shrink-0">{app.steps.length + 1}</span>
              <p className="text-lg pt-0.5">Delivers it where you chose, and keeps a copy in My Apps.</p>
            </li>
          </ol>
          {!app.isCustom && <p className="text-center text-sm text-fg-muted mt-6 max-w-xl mx-auto">{autonomyLine(app.slug, app.steps)}</p>}
        </section>
      )}

      {/* samples */}
      {cur && (
        <section id="samples" className="py-12 border-t border-line scroll-mt-6">
          <div className="text-center mb-8 space-y-2">
            <h2 className="font-title text-2xl md:text-3xl font-semibold tracking-tight">See exactly what you get</h2>
            <p className="text-fg-muted">Real examples — canned demo data, nothing charged.</p>
          </div>
          {examples.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto justify-center pb-4 -mx-1 px-1">
              {examples.map((e, i) => (
                <button key={i} type="button" onClick={() => setEx(i)} className={cn("shrink-0 px-4 py-2 rounded-full text-sm font-title font-medium transition border", i === ex ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{e.label}</button>
              ))}
            </div>
          )}
          <div key={ex} className="max-w-3xl mx-auto slide-fade">
            <ResultView output={cur.result} schema={cur.schema} isMock />
          </div>
        </section>
      )}

      {/* final CTA */}
      <section className="py-14 border-t border-line text-center">
        <div className="squircle rounded-5 bg-fg text-bg p-10 md:p-14 max-w-2xl mx-auto space-y-5">
          <h2 className="font-title text-3xl md:text-4xl font-semibold tracking-tight">{app.isCustom ? "Build your own app" : `Ready to try ${app.name.split(" ")[0]}?`}</h2>
          <p className="text-bg/70 text-lg">It runs once so you can see the real result — you only pay when it actually runs.</p>
          <Link href={run}><Button phase="green" size="lg" className="glow-coral">Use now →</Button></Link>
        </div>
      </section>
    </div>
  );
}
