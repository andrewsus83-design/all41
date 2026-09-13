"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveBriefingDemo } from "./live-briefing-demo";
import type { GalleryApp } from "@/content/gallery";
import { cn } from "@/lib/cn";

function price(usd: number) {
  return usd >= 1 ? `$${usd.toFixed(2).replace(/\.00$/, "")}` : `$${usd.toFixed(2)}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AppGallery({ apps, filters = false }: { apps: GalleryApp[]; filters?: boolean }) {
  const [active, setActive] = useState<GalleryApp | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set(apps.map((a) => a.category).filter(Boolean) as string[])).sort(),
    [apps],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      const okCat = cat === "all" || a.category === cat;
      const okQ = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || (a.replaces ?? "").toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [apps, query, cat]);

  return (
    <>
      {filters ? (
        <div className="flex flex-col items-center gap-5 mb-10">
          <label className="relative w-full max-w-lg">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint" aria-hidden>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              aria-label="Search tools"
              className="w-full h-12 pl-10 pr-4 rounded-full bg-bg-elev border border-line text-fg placeholder:text-fg-faint outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20 shadow-soft"
            />
          </label>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Pill active={cat === "all"} onClick={() => setCat("all")}>All</Pill>
            {categories.map((c) => (
              <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{cap(c)}</Pill>
            ))}
          </div>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-fg-faint text-center py-10">No tools match that search.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((a) => (
            <GalleryCard key={a.slug} app={a} onOpen={() => setActive(a)} />
          ))}
        </div>
      )}

      {active ? <AppModal app={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-title font-medium border transition",
        active ? "bg-fg text-bg border-fg" : "bg-bg-elev text-fg-muted border-line hover:border-line-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function GalleryCard({ app, onOpen }: { app: GalleryApp; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left h-full flex flex-col rounded-5 border border-line bg-bg-elev shadow-soft overflow-hidden lift hover:border-line-strong hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-sunken">
        {app.cover ? (
          <Image src={app.cover} alt="" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-5xl" aria-hidden>{app.icon ?? "◻"}</span>
        )}
      </div>
      <div className="p-5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-title text-lg font-bold">{app.name}</h3>
          <span className="num text-sm text-fg-muted shrink-0">≈ {price(app.priceUsd)}</span>
        </div>
        <p className="text-sm text-fg-muted line-clamp-2">{app.description}</p>
        {app.replaces ? <p className="text-xs text-fg-faint mt-1">instead of {app.replaces}</p> : null}
      </div>
    </button>
  );
}

function AppModal({ app, onClose }: { app: GalleryApp; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={app.name}>
      <div className="fixed inset-0 bg-fg/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-3xl my-2 sm:my-6 rounded-6 border border-line bg-bg shadow-lift overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-bg-elev/90 border border-line grid place-items-center text-fg-muted hover:bg-sunken hover:text-fg transition"
        >
          ✕
        </button>

        {app.cover ? (
          <div className="relative aspect-[2/1] w-full border-b border-line">
            <Image src={app.cover} alt="" fill sizes="100vw" className="object-cover" priority />
          </div>
        ) : null}

        <div className="p-6 md:p-8 space-y-7">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-title text-2xl md:text-3xl font-bold">{app.name}</h2>
              <span className="num text-fg-muted">≈ {price(app.priceUsd)} per run</span>
            </div>
            {app.replaces ? <p className="text-sm text-fg-faint">instead of {app.replaces} · no subscription</p> : null}
            <p className="text-fg-muted leading-relaxed">{app.description}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Live demo</p>
            <LiveBriefingDemo />
          </div>

          {app.useCases.length ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Who it&apos;s for</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {app.useCases.map((u) => (
                  <div key={u.who} className="rounded-3 border border-line bg-bg-elev p-4 space-y-1">
                    <p className="font-title font-medium text-sm">{u.who}</p>
                    <p className="text-sm text-fg-muted leading-relaxed">{u.job}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {app.faqs.length ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Good to know</p>
              <div className="divide-y divide-line border-y border-line">
                {app.faqs.slice(0, 4).map((f, i) => (
                  <details key={i} className="group py-3">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-title font-medium text-fg">
                      {f.q}
                      <span className="text-fg-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="text-sm text-fg-muted leading-relaxed mt-2">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={`/my-apps/${app.slug}`}><Button phase="green" className="glow-coral">Set it up in 20 seconds</Button></Link>
            <Link href={`/apps/${app.slug}`}><Button phase="ghost">Full details →</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
