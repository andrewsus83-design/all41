"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { AppDetail } from "./app-detail";
import { categoryLabel, costPrefix } from "@/components/build/catalog-copy";
import type { CatalogApp } from "@/components/apps/types";

const TINTS = [
  { bg: "bg-coral-soft", ring: "border-coral/25", ink: "text-coral" },
  { bg: "bg-amber-soft", ring: "border-amber/25", ink: "text-amber" },
  { bg: "bg-green-soft", ring: "border-green/25", ink: "text-green" },
] as const;

/** The Explore surface — one big panel: a featured carousel, a category bar, search, and a grid.
 * Discovery only; picking an app hands off to the run flow at /chat?app=slug. */
export function ExploreGallery({ apps }: { apps: CatalogApp[] }) {
  const router = useRouter();
  const real = useMemo(() => apps.filter((a) => !a.isCustom), [apps]);
  const custom = useMemo(() => apps.find((a) => a.isCustom) ?? null, [apps]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [active, setActive] = useState<CatalogApp | null>(null);

  const categories = useMemo(() => {
    const seen = new Map<string, { n: number; icon: string }>();
    for (const a of real) {
      const c = a.category ?? "other";
      const cur = seen.get(c);
      if (cur) cur.n += 1;
      else seen.set(c, { n: 1, icon: a.icon });
    }
    return Array.from(seen.entries()).sort((a, b) => b[1].n - a[1].n).map(([c, v]) => ({ c, ...v }));
  }, [real]);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      real.filter((a) => {
        if (cat && (a.category ?? "other") !== cat) return false;
        if (!needle) return true;
        const hay = [a.name, a.description, a.category ?? "", ...a.tags].join(" ").toLowerCase();
        return needle.split(/\s+/).every((w) => hay.includes(w));
      }),
    [real, cat, needle],
  );

  const featured = real.slice(0, 5);
  const open = (slug: string) => router.push(`/chat?app=${slug}`);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-4">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Explore</h1>
          <p className="text-fg-muted text-lg">Everything all41 can do for you — pick one and it walks you through the rest.</p>
        </div>
        <SearchBar value={q} onChange={setQ} />
      </header>

      {featured.length > 0 && !needle && !cat && <Carousel apps={featured} onOpen={open} />}

      {/* category bar — icon + label, active underline (Airbnb-style) */}
      {categories.length > 1 && (
        <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1 border-b border-line">
          <CatTab label="All" icon="✦" count={real.length} active={cat === null} onClick={() => setCat(null)} />
          {categories.map(({ c, icon, n }) => (
            <CatTab key={c} label={categoryLabel(c)} icon={icon} count={n} active={cat === c} onClick={() => setCat(cat === c ? null : c)} />
          ))}
        </div>
      )}

      {/* grid */}
      {shown.length === 0 ? (
        <div className="squircle rounded-4 border border-line bg-bg-elev p-10 text-center space-y-2">
          <p className="text-lg font-title font-medium">Nothing matches “{q}”.</p>
          <p className="text-fg-muted text-sm">Try another word{custom ? " — or start something from scratch." : "."}</p>
          {custom && <Button phase="ghost" onClick={() => open(custom.slug)}>Start from scratch →</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((a) => (
            <AppCard key={a.slug} app={a} onClick={() => setActive(a)} />
          ))}
          {custom && !cat && (
            <button type="button" onClick={() => open(custom.slug)} className="squircle text-left rounded-4 border border-dashed border-amber/50 bg-amber-soft/40 p-5 flex flex-col justify-center items-center gap-2 min-h-44 transition hover:bg-amber-soft">
              <span className="text-3xl leading-none">✦</span>
              <span className="font-title font-medium">Start from scratch</span>
              <span className="text-sm text-fg-muted text-center">Describe your own app and we&apos;ll build it.</span>
            </button>
          )}
        </div>
      )}

      {active && <AppDetail app={active} onClose={() => setActive(null)} onBuild={() => open(active.slug)} />}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="squircle flex items-center gap-3 rounded-full border border-line-strong bg-bg-elev px-5 h-14 shadow-sm max-w-2xl">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-fg-faint shrink-0" aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search apps — clips, websites, research…" aria-label="Search apps" className="flex-1 bg-transparent outline-none text-base min-w-0" />
      {value && <button type="button" onClick={() => onChange("")} aria-label="Clear" className="text-fg-faint hover:text-fg text-lg leading-none">×</button>}
    </div>
  );
}

function CatTab({ label, icon, count, active, onClick }: { label: string; icon: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 flex items-center gap-2 px-3.5 py-2.5 -mb-px border-b-2 transition whitespace-nowrap",
        active ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
      )}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="font-title font-medium text-sm">{label}</span>
      <span className="num text-xs text-fg-faint">{count}</span>
    </button>
  );
}

function AppCard({ app, onClick }: { app: CatalogApp; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="squircle group text-left rounded-4 border border-line bg-bg-elev p-5 space-y-3 transition hover:border-line-strong hover:bg-bg-elev-2 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center size-12 rounded-3 bg-bg-elev-2 text-2xl leading-none shrink-0 group-hover:bg-bg">{app.icon}</span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-title font-medium truncate">{app.name}</p>
          {app.category && <p className="text-xs text-fg-faint mt-0.5">{categoryLabel(app.category)}</p>}
        </div>
      </div>
      <p className="text-sm text-fg-muted line-clamp-2 min-h-10">{app.description}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-fg-faint">{costPrefix(app.slug, app.steps)} <Money usd={app.estCostUsd} /> per run</span>
        <span className="text-sm text-green font-title font-medium opacity-0 group-hover:opacity-100 transition">Open →</span>
      </div>
    </button>
  );
}

function Carousel({ apps, onOpen }: { apps: CatalogApp[]; onOpen: (slug: string) => void }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = apps.length;
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (paused || n <= 1) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused, n]);

  const goto = (x: number) => setI(((x % n) + n) % n);

  return (
    <section aria-roledescription="carousel" aria-label="Popular apps" className="space-y-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="squircle relative overflow-hidden rounded-5">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {apps.map((a, idx) => {
            const t = TINTS[idx % TINTS.length];
            return (
              <div key={a.slug} className="w-full shrink-0 px-0.5" aria-hidden={idx !== i}>
                <div className={cn("squircle relative rounded-5 border p-7 md:p-9 min-h-52 flex flex-col justify-between overflow-hidden", t.bg, t.ring)}>
                  <span className="pointer-events-none absolute -right-6 -bottom-10 text-[10rem] leading-none opacity-10 select-none" aria-hidden>{a.icon}</span>
                  <div className="relative space-y-3 max-w-xl">
                    <span className={cn("inline-flex items-center gap-1.5 squircle rounded-full bg-bg/70 backdrop-blur px-3 py-1 text-xs font-title font-medium", t.ink)}>★ Popular</span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl leading-none">{a.icon}</span>
                      <h2 className="text-2xl md:text-3xl font-title font-semibold tracking-tight">{a.name}</h2>
                    </div>
                    <p className="text-fg-muted text-pretty line-clamp-2 max-w-lg">{a.description}</p>
                  </div>
                  <div className="relative pt-4">
                    <Button phase="green" size="lg" onClick={() => onOpen(a.slug)}>Try {a.name.split(" ")[0]} →</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {n > 1 && (
          <>
            <button type="button" onClick={() => goto(i - 1)} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-bg/80 backdrop-blur border border-line text-fg hover:bg-bg transition">‹</button>
            <button type="button" onClick={() => goto(i + 1)} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full grid place-items-center bg-bg/80 backdrop-blur border border-line text-fg hover:bg-bg transition">›</button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="flex justify-center gap-2">
          {apps.map((a, idx) => (
            <button key={a.slug} type="button" onClick={() => goto(idx)} aria-label={`Go to ${a.name}`} aria-current={idx === i} className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-6 bg-fg" : "w-1.5 bg-line-strong hover:bg-fg-faint")} />
          ))}
        </div>
      )}
    </section>
  );
}
