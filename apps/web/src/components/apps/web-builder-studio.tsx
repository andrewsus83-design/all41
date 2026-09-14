"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { RunProgress } from "@/components/apps/run-progress";
import { WebsiteReport } from "@/components/apps/website-report";
import { useAppRun } from "@/components/apps/use-app-run";
import { createDraft, publishDraft, discardDraft } from "@/app/(app)/build/actions";
import type { CatalogApp } from "@/components/apps/types";

/* ---------- answer model ---------- */
type Answers = {
  brand_name: string;
  what_they_do: string;
  audience: string;
  pages: string[];
  products: string;
  reference_urls: string;
  style_preset: StyleKey;
  checkout_url: string;
  schedule: "Once";
  output_target: "Dashboard";
};
const PAGE_OPTIONS = ["Home", "About", "Products/Services", "Contact", "Blog"];
const empty: Answers = { brand_name: "", what_they_do: "", audience: "", pages: ["Home", "About", "Products/Services", "Contact"], products: "", reference_urls: "", style_preset: "Warm", checkout_url: "", schedule: "Once", output_target: "Dashboard" };

/* ---------- style system (drives the live preview) ---------- */
type StyleKey = "Clean" | "Bold" | "Warm" | "Minimal";
type Style = { ink: string; accent: string; accent2: string; paper: string; soft: string; onAccent: string; font: string; weight: number; tracking: string; radius: number; upper: boolean; blurb: string };
const STYLES: Record<StyleKey, Style> = {
  Clean: { ink: "#0f172a", accent: "#2563eb", accent2: "#dbeafe", paper: "#ffffff", soft: "#f1f5f9", onAccent: "#fff", font: "'Inter',system-ui,sans-serif", weight: 700, tracking: "-0.02em", radius: 12, upper: false, blurb: "Crisp, trustworthy, corporate-friendly" },
  Bold: { ink: "#0a0a0a", accent: "#ff5a3c", accent2: "#ffe3d8", paper: "#ffffff", soft: "#fff4ed", onAccent: "#fff", font: "'Inter',system-ui,sans-serif", weight: 800, tracking: "-0.035em", radius: 20, upper: false, blurb: "Big type, high energy, hard to ignore" },
  Warm: { ink: "#2b1a10", accent: "#c1862f", accent2: "#efe0c8", paper: "#fbf7f0", soft: "#f3e7d8", onAccent: "#fff", font: "Georgia,'Times New Roman',serif", weight: 600, tracking: "0", radius: 16, upper: false, blurb: "Editorial, hand-made, hospitable" },
  Minimal: { ink: "#1a1a1a", accent: "#1a1a1a", accent2: "#e5e5e5", paper: "#ffffff", soft: "#fafafa", onAccent: "#fff", font: "'Inter',system-ui,sans-serif", weight: 500, tracking: "0.01em", radius: 6, upper: true, blurb: "Quiet, spacious, gallery-like" },
};
const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];

/* ---------- derived preview copy (instant, no LLM) ---------- */
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
function heroCopy(a: Answers) {
  const brand = a.brand_name.trim() || "Your Brand";
  const does = a.what_they_do.trim();
  const who = a.audience.trim();
  const headline = does ? titleCase(does).replace(/\.$/, "") + (who ? `, for ${who}.` : ".") : "A site that works as hard as you do.";
  const sub = does && who ? `${titleCase(brand)} helps ${who} get ${does.toLowerCase()} — done properly, without the overwhelm.` : "Answer a few questions and watch it come together — live.";
  return { brand, headline, sub };
}
const navFor = (a: Answers) => (a.pages.length ? a.pages : ["Home"]).map((p) => (p === "Products/Services" ? "Services" : p));
const productLines = (a: Answers) => a.products.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 3);

/* ---------- the live preview: a browser-framed one-page site ---------- */
function LivePreview({ a }: { a: Answers }) {
  const s = STYLES[a.style_preset];
  const { brand, headline, sub } = heroCopy(a);
  const nav = navFor(a);
  const prods = productLines(a);
  const sub9 = (a.brand_name.trim() || "your-brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const btn = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, borderRadius: s.radius, padding: "9px 16px", fontWeight: 600, fontSize: 12, display: "inline-block", letterSpacing: s.upper ? "0.08em" : "0", textTransform: s.upper ? "uppercase" : "none" });
  const cardTitles = prods.length ? prods : ["What we do", "How it works", "Why us"];

  return (
    <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift bg-white" style={{ containerType: "inline-size" }}>
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line" style={{ background: "#f3f2ef" }}>
        <span className="size-2.5 rounded-full" style={{ background: "#ff5f57" }} /><span className="size-2.5 rounded-full" style={{ background: "#febc2e" }} /><span className="size-2.5 rounded-full" style={{ background: "#28c840" }} />
        <div className="ml-2 flex-1 truncate rounded-full bg-white/80 border border-line px-3 py-1 text-[11px] text-fg-faint num">{sub9}.all41.app</div>
        <span className="text-[10px] font-title font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--green-soft)", color: "var(--green)" }}>live preview</span>
      </div>

      {/* the site */}
      <div style={{ background: s.paper, color: s.ink, fontFamily: s.font }}>
        {/* header */}
        <div className="flex items-center justify-between" style={{ padding: "14px 5cqw", borderBottom: `1px solid ${s.soft}` }}>
          <span style={{ fontWeight: 800, letterSpacing: s.tracking, fontSize: "clamp(15px,3.2cqw,20px)" }}>{titleCase(brand)}</span>
          <div className="items-center gap-4 hidden sm:flex" style={{ fontSize: 12, opacity: 0.75 }}>
            {nav.slice(0, 4).map((n) => <span key={n} style={{ textTransform: s.upper ? "uppercase" : "none", letterSpacing: s.upper ? "0.06em" : "0" }}>{n}</span>)}
          </div>
          <span style={btn(s.accent, s.onAccent)}>{a.checkout_url ? "Buy now" : "Get in touch"}</span>
        </div>

        {/* hero */}
        <div style={{ padding: "7cqw 5cqw", background: `linear-gradient(180deg, ${s.paper}, ${s.soft})` }}>
          <span style={{ display: "inline-block", marginBottom: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: s.accent }}>{a.style_preset} · {brand}</span>
          <h1 style={{ fontWeight: s.weight, letterSpacing: s.tracking, lineHeight: 1.05, fontSize: "clamp(24px,8cqw,52px)", maxWidth: "18ch", margin: 0 }}>{headline}</h1>
          <p style={{ marginTop: 14, fontSize: "clamp(12px,2.6cqw,16px)", opacity: 0.72, maxWidth: "42ch", lineHeight: 1.5 }}>{sub}</p>
          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={btn(s.accent, s.onAccent)}>{a.checkout_url ? "Shop now" : "Book a call"}</span>
            <span style={{ ...btn("transparent", s.ink), border: `1px solid ${s.ink}22` }}>Learn more</span>
          </div>
        </div>

        {/* three-up */}
        <div style={{ padding: "6cqw 5cqw", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3cqw" }}>
          {cardTitles.map((t, i) => (
            <div key={i} style={{ background: s.soft, borderRadius: s.radius, padding: "4cqw 3.4cqw" }}>
              <div style={{ width: 26, height: 26, borderRadius: s.radius / 2, background: i === 1 ? s.accent : s.accent2, marginBottom: 10 }} />
              <p style={{ fontWeight: 700, fontSize: "clamp(11px,2.4cqw,14px)", letterSpacing: s.tracking, margin: 0 }}>{t}</p>
              <p style={{ fontSize: "clamp(9px,2cqw,12px)", opacity: 0.6, marginTop: 5, lineHeight: 1.45 }}>{a.audience ? `Built for ${a.audience}.` : "A clear, benefit-led section."}</p>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ padding: "4cqw 5cqw", borderTop: `1px solid ${s.soft}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, opacity: 0.6 }}>
          <span style={{ fontWeight: 700 }}>{titleCase(brand)}</span>
          <span className="num">© {brand ? "" : ""}{sub9}.all41.app</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- step scaffolding ---------- */
const STEPS = ["Style", "Business", "Pages", "Details", "Build"] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-title font-medium">{label}{hint && <span className="text-fg-faint font-normal"> · {hint}</span>}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full squircle rounded-3 border border-line-strong bg-bg-elev px-4 py-3 text-base outline-none focus:border-green transition";

/* ---------- the studio ---------- */
export function WebBuilderStudio({ app, balance }: { app: CatalogApp; balance: number }) {
  const router = useRouter();
  const [a, setA] = useState<Answers>(empty);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<{ instanceId: string; estimateUsd: number; balance: number } | null>(null);
  const [published, setPublished] = useState<{ instanceId: string; live: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const stream = useAppRun();
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((p) => ({ ...p, [k]: v }));

  const canNext = useMemo(() => {
    if (step === 1) return a.brand_name.trim().length > 0 && a.what_they_do.trim().length > 0;
    if (step === 2) return a.pages.length > 0;
    return true;
  }, [step, a]);

  const running = stream.running;
  const result = stream.result?.result as { output?: unknown } | undefined;
  const report = result?.output;

  const build = () => {
    setErr(null);
    start(async () => {
      const r = draft ? { ok: true as const, instanceId: draft.instanceId, estimateUsd: draft.estimateUsd, balance: draft.balance } : await createDraft(app.slug, a as unknown as Record<string, unknown>);
      if (!r.ok) { setErr(r.error); return; }
      setDraft({ instanceId: r.instanceId, estimateUsd: r.estimateUsd, balance: r.balance });
      void stream.run(r.instanceId, { preview: true });
    });
  };
  const publish = () => {
    if (!draft) return;
    start(async () => {
      const r = await publishDraft(draft.instanceId, a.brand_name || "My website");
      if (!r.ok) { setErr(r.error); return; }
      setPublished({ instanceId: r.instanceId, live: r.live });
      router.refresh();
    });
  };
  const startOver = () => {
    if (draft) void discardDraft(draft.instanceId);
    setDraft(null); setPublished(null); setErr(null); stream.reset(); setStep(0);
  };

  const insufficient = draft && !running && !report && draft.balance < draft.estimateUsd;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg">
      {/* top bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 md:px-8 h-16 border-b border-line bg-bg/80 backdrop-blur sticky top-0 z-10">
        <Link href="/a/web-builder" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Web Builder</Link>
        <div className="hidden sm:flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <button key={label} type="button" onClick={() => !running && !report && i <= Math.max(step, 0) && setStep(i)} disabled={running || !!report} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-title font-medium transition", i === step ? "bg-fg text-bg" : i < step ? "text-fg" : "text-fg-faint")}>
              <span className={cn("num grid place-items-center size-4 rounded-full text-[10px]", i === step ? "bg-bg/25" : i < step ? "bg-green text-white" : "bg-line-strong text-bg")}>{i < step ? "✓" : i + 1}</span>{label}
            </button>
          ))}
        </div>
        <span className="text-xs text-fg-faint">Credit <Money usd={balance} className="text-fg" /></span>
      </div>

      <div className="flex-1 grid lg:grid-cols-[minmax(0,440px)_1fr] min-h-0">
        {/* LEFT — the guided steps */}
        <div className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-line overflow-y-auto">
          <div className="max-w-md mx-auto px-5 md:px-8 py-8 space-y-6">
            {published ? (
              <div className="space-y-4">
                <span className="grid place-items-center size-14 rounded-full bg-green-soft text-green text-2xl">✓</span>
                <h2 className="font-title text-2xl font-semibold tracking-tight">It&apos;s in My Apps.</h2>
                <p className="text-fg-muted">{published.live ? "It runs on schedule — the next run is on your calendar." : "It ran once and the site is saved. Run it again any time from My Apps."}</p>
                <div className="flex gap-3 flex-wrap">
                  <Link href={`/my-apps?id=${published.instanceId}`}><Button phase="green">Open in My Apps →</Button></Link>
                  <Button phase="ghost" onClick={startOver}>Build another</Button>
                </div>
              </div>
            ) : report ? (
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-widest text-green font-title font-semibold">Your site is built</span>
                <h2 className="font-title text-2xl font-semibold tracking-tight">Here&apos;s {a.brand_name || "your site"} — for real.</h2>
                <p className="text-fg-muted">Copy, pages, design system and SEO are all done. Publish it to keep it and put it live at your address.</p>
                <div className="flex gap-3 flex-wrap">
                  <Button phase="green" disabled={pending} onClick={publish}>Publish to My Apps</Button>
                  <Button phase="ghost" disabled={pending} onClick={startOver}>Start over</Button>
                </div>
                {err && <p className="text-sm text-red">{err}</p>}
              </div>
            ) : running || stream.frames.length > 0 ? (
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-widest text-coral font-title font-semibold">Building it for real</span>
                <h2 className="font-title text-2xl font-semibold tracking-tight">The crew is on it.</h2>
                <RunProgress frames={stream.frames} running={running} />
              </div>
            ) : step === 0 ? (
              <div className="space-y-5">
                <Header n={1} title="What's the vibe?" sub="Pick a feel — the preview updates instantly. You can change it any time." />
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_KEYS.map((k) => <StyleCard key={k} k={k} active={a.style_preset === k} onPick={() => set("style_preset", k)} />)}
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-5">
                <Header n={2} title="Tell us about your business" sub="Just the essentials — the crew writes the rest." />
                <Field label="What's your business?"><input className={inputCls} value={a.brand_name} onChange={(e) => set("brand_name", e.target.value)} placeholder="e.g. Emberwood Coffee" autoFocus /></Field>
                <Field label="What do you do?"><input className={inputCls} value={a.what_they_do} onChange={(e) => set("what_they_do", e.target.value)} placeholder="e.g. small-batch coffee roasting" /></Field>
                <Field label="Who's it for?" hint="optional"><input className={inputCls} value={a.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. home brewers who care about freshness" /></Field>
              </div>
            ) : step === 2 ? (
              <div className="space-y-5">
                <Header n={3} title="What pages do you need?" sub="Tap to add or remove. We'll build each one properly." />
                <div className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS.map((p) => {
                    const on = a.pages.includes(p);
                    return <button key={p} type="button" onClick={() => set("pages", on ? a.pages.filter((x) => x !== p) : [...a.pages, p])} className={cn("squircle rounded-full border px-4 py-2 text-sm font-title font-medium transition", on ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{on ? "✓ " : "+ "}{p}</button>;
                  })}
                </div>
                <Field label="Products or services?" hint="optional — one per line"><textarea className={cn(inputCls, "min-h-24 resize-y")} value={a.products} onChange={(e) => set("products", e.target.value)} placeholder={"House Blend — $18\nSubscription — $16/mo\nGift set — $40"} /></Field>
              </div>
            ) : step === 3 ? (
              <div className="space-y-5">
                <Header n={4} title="A few finishing touches" sub="All optional — skip anything you're not sure about." />
                <Field label="Sites whose style you like?" hint="we take inspiration, never copy"><input className={inputCls} value={a.reference_urls} onChange={(e) => set("reference_urls", e.target.value)} placeholder="2–3 URLs, comma-separated" /></Field>
                <Field label="Buy link / checkout?" hint="we link to it, never process payment"><input className={inputCls} value={a.checkout_url} onChange={(e) => set("checkout_url", e.target.value)} placeholder="your existing checkout link" /></Field>
              </div>
            ) : (
              <div className="space-y-5">
                <Header n={5} title="Ready to build it for real" sub="The preview on the right is instant. Building runs the specialist crew — real copy, pages, SEO." />
                <div className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2.5 text-sm">
                  <Row k="Business" v={a.brand_name || "—"} />
                  <Row k="Does" v={a.what_they_do || "—"} />
                  <Row k="For" v={a.audience || "everyone"} />
                  <Row k="Pages" v={a.pages.join(" · ") || "—"} />
                  <Row k="Style" v={a.style_preset} />
                </div>
                <div className="squircle rounded-4 border border-green/30 bg-green-soft p-4 flex items-center justify-between gap-3">
                  <div><p className="font-title font-medium">Build my website</p><p className="text-sm text-fg-muted">One real run — about <Money usd={draft?.estimateUsd ?? app.estCostUsd} />. Nothing charged until it runs.</p></div>
                </div>
                {insufficient ? (
                  <div className="flex gap-2 flex-wrap"><Link href="/settings/billing"><Button phase="green">Top up</Button></Link><Button phase="ghost" onClick={() => setStep(1)}>Edit answers</Button></div>
                ) : (
                  <Button phase="green" size="lg" className="w-full glow-coral" disabled={pending} onClick={build}>Build my website →</Button>
                )}
                {err && <p className="text-sm text-red">{err}</p>}
              </div>
            )}

            {/* nav buttons for the question steps */}
            {!running && !report && !published && step < 4 && (
              <div className="flex items-center justify-between pt-2">
                <Button phase="ghost" onClick={() => setStep(Math.max(0, step - 1))} className={cn(step === 0 && "invisible")}>← Back</Button>
                <Button phase="green" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 3 ? "Review →" : "Continue →"}</Button>
              </div>
            )}
            {!running && !report && !published && step === 4 && (
              <button type="button" onClick={() => setStep(3)} className="text-sm text-fg-faint hover:text-fg transition">← Back</button>
            )}
          </div>
        </div>

        {/* RIGHT — the live preview (real result once built) */}
        <div className="order-1 lg:order-2 bg-bg-elev/50 overflow-y-auto lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]">
          <div className="p-5 md:p-8">
            {report ? (
              <div className="slide-fade"><WebsiteReport report={report} isMock /></div>
            ) : (
              <div className="max-w-xl mx-auto space-y-3">
                <p className="text-xs uppercase tracking-widest text-fg-faint font-title font-semibold text-center">{running ? "Building the real thing…" : "Live preview — updates as you answer"}</p>
                <div className={cn(running && "opacity-50 pointer-events-none transition")}><LivePreview a={a} /></div>
                {!running && <p className="text-center text-xs text-fg-faint">This is an instant mock. <span className="text-fg-muted">Build it</span> to get real copy, every page, design system & SEO.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs uppercase tracking-widest text-coral font-title font-semibold">Step {n} of 5</span>
      <h1 className="font-title text-2xl md:text-3xl font-semibold tracking-tight text-pretty">{title}</h1>
      <p className="text-fg-muted">{sub}</p>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-3"><span className="w-16 shrink-0 text-fg-faint">{k}</span><span className="font-medium text-pretty">{v}</span></div>;
}
function StyleCard({ k, active, onPick }: { k: StyleKey; active: boolean; onPick: () => void }) {
  const s = STYLES[k];
  return (
    <button type="button" onClick={onPick} className={cn("squircle rounded-4 border-2 overflow-hidden text-left transition", active ? "border-green shadow-lift" : "border-line hover:border-line-strong")}>
      <div style={{ background: s.paper, padding: "14px 14px 16px" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          <span style={{ width: 22, height: 22, borderRadius: s.radius / 2, background: s.accent }} />
          <span style={{ width: 22, height: 22, borderRadius: s.radius / 2, background: s.accent2 }} />
          <span style={{ width: 22, height: 22, borderRadius: s.radius / 2, background: s.soft, border: `1px solid ${s.ink}18` }} />
        </div>
        <p style={{ color: s.ink, fontFamily: s.font, fontWeight: s.weight, letterSpacing: s.tracking, fontSize: 18, textTransform: s.upper ? "uppercase" : "none", margin: 0 }}>{k}</p>
      </div>
      <div className="px-3 py-2 bg-bg-elev border-t border-line">
        <p className="text-[11px] text-fg-muted leading-snug">{s.blurb}</p>
      </div>
    </button>
  );
}
