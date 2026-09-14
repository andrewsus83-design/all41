"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `content_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Core = { title_options?: string[]; body?: string; takeaway?: string };
type Repurpose = { channel?: string; content?: string; hook_options?: string[] };
type ScheduleItem = { channel?: string; when?: string; piece_ref?: string };
type Source = { ref?: string; quote?: string };
export type ContentReportData = {
  summary?: string;
  core?: Core;
  repurposes?: Repurpose[];
  schedule?: ScheduleItem[];
  flags?: string[];
  sources?: Source[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

type Brand = { label: string; color: string; glyph: string; handle?: string };
function brandOf(ch: string): Brand {
  const k = ch.toLowerCase().replace(/[^a-z]/g, "");
  if (k.includes("linkedin")) return { label: "LinkedIn", color: "#0a66c2", glyph: "in", handle: "You · Founder" };
  if (k === "x" || k.includes("twitter")) return { label: "X", color: "#111111", glyph: "𝕏", handle: "@you" };
  if (k.includes("instagram") || k === "ig") return { label: "Instagram", color: "#c13584", glyph: "◙", handle: "@you" };
  if (k.includes("news") || k.includes("email")) return { label: "Newsletter", color: "#0e7a4b", glyph: "✉", handle: "To subscribers" };
  if (k.includes("blog")) return { label: "Blog", color: "#d8402f", glyph: "¶" };
  return { label: ch, color: "#6b6660", glyph: "•" };
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}
      className={cn("inline-flex items-center gap-1.5 text-xs font-title font-medium px-2.5 py-1.5 rounded-full border transition", done ? "border-green/40 text-green bg-green-soft" : "border-line text-fg-muted hover:text-fg hover:border-line-strong")}
    >
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}

/** Minimal markdown → prose (headings, bullets, paragraphs). No external deps. */
function Prose({ md }: { md: string }) {
  const blocks = md.split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const line = b.trim();
        if (/^#\s/.test(line)) return <h3 key={i} className="font-title text-xl font-semibold">{line.replace(/^#\s/, "")}</h3>;
        if (/^##\s/.test(line)) return <h4 key={i} className="font-title text-lg font-medium">{line.replace(/^##\s/, "")}</h4>;
        if (/^[-*]\s/m.test(line)) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{line.split(/\n/).map((l, j) => <li key={j}>{l.replace(/^[-*]\s/, "")}</li>)}</ul>;
        }
        return <p key={i} className="leading-relaxed whitespace-pre-wrap">{line}</p>;
      })}
    </div>
  );
}

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Fact-checked — every stat traces to a source and the pieces are original." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Fact-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Fact-checked — some claims didn’t line up with the sources; see the flags below." };
  return null;
}

/** Content Pipeline result — the finished pieces, shown the way you'd actually use them (Jasper-style workspace). */
export function ContentReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  if (!report || typeof report !== "object") return null;
  const r = report as ContentReportData;
  const core = r.core ?? {};
  const titles = arr<string>(core.title_options);
  const repurposes = arr<Repurpose>(r.repurposes);
  const schedule = arr<ScheduleItem>(r.schedule);
  const flags = arr<string>(r.flags);
  const sources = arr<Source>(r.sources);
  const dc = doubleChecked(verification);
  const pieceCount = repurposes.length + (core.body ? 1 : 0);

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="green">{pieceCount} pieces ready</Badge>
          <span className="text-sm text-fg-muted">A week of content from one idea — ready to copy and post.</span>
        </div>
        <div className="flex items-center gap-2">
          {isMock && <Badge tone="amber">sample</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
      </div>
      {dc && (
        <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
          <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />{dc.text}
        </p>
      )}

      {/* CORE PIECE — a real document */}
      {(core.body || titles.length > 0) && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">The core piece</h3>
          {titles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-fg-faint">Headline options — A/B test them</p>
              <div className="flex flex-wrap gap-2">
                {titles.map((t, i) => <span key={i} className="squircle rounded-full border border-line bg-bg-elev px-3 py-1.5 text-sm font-title font-medium">{t}</span>)}
              </div>
            </div>
          )}
          {core.body && (
            <article className="squircle rounded-4 border border-line bg-bg-elev p-6 md:p-8">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs uppercase tracking-wide text-fg-faint">Article draft</span>
                <CopyButton text={core.body} />
              </div>
              <div className="text-fg leading-relaxed"><Prose md={core.body} /></div>
              {core.takeaway && <p className="mt-5 pt-4 border-t border-line text-sm text-green"><span className="text-fg-faint">Takeaway: </span>{core.takeaway}</p>}
            </article>
          )}
        </section>
      )}

      {/* REPURPOSES — shown as the real thing on each platform */}
      {repurposes.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Ready to post — exactly as it&apos;ll look</h3>
          <div className="grid md:grid-cols-2 gap-5 items-start">
            {repurposes.map((p, i) => (
              <div key={i} className="space-y-2">
                <PlatformPost p={p} />
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-xs text-fg-faint">{brandOf(p.channel ?? "").label}</span>
                  <CopyButton text={p.content ?? ""} />
                </div>
                {arr<string>(p.hook_options).length > 0 && (
                  <div className="px-1 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-fg-faint">Alt hooks</p>
                    {arr<string>(p.hook_options).map((h, j) => <p key={j} className="text-sm text-fg-muted flex gap-2"><span className="text-fg-faint shrink-0">•</span>{h}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SCHEDULE — the week */}
      {schedule.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Your posting week</h3>
          <div className="flex flex-wrap gap-2">
            {schedule.map((s, i) => {
              const b = brandOf(s.channel ?? "");
              return (
                <div key={i} className="squircle rounded-3 border border-line bg-bg-elev px-4 py-2.5 flex items-center gap-2.5">
                  <span className="grid place-items-center size-6 rounded-full text-white text-xs font-bold" style={{ background: b.color }}>{b.glyph}</span>
                  <div className="leading-tight">
                    <p className="text-xs text-fg-faint">{s.when}</p>
                    <p className="text-sm font-title font-medium">{b.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* flags */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before you post</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}

      {/* sources */}
      {sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex gap-3"><span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span><span className="text-fg-muted">“{s.quote}”</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------- authentic platform post cards ----------
function Ico({ children, size = 18, fill = "none", className }: { children: React.ReactNode; size?: number; fill?: string; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{children}</svg>;
}
function Avatar({ size = 44, bg = "#111", initial = "Y" }: { size?: number; bg?: string; initial?: string }) {
  return <span style={{ width: size, height: size, background: bg }} className="grid place-items-center rounded-full text-white font-semibold shrink-0" >{initial}</span>;
}

type P = { channel?: string; content?: string; hook_options?: string[] };
function platformKind(ch: string): "x" | "linkedin" | "instagram" | "newsletter" | "blog" {
  const k = ch.toLowerCase().replace(/[^a-z]/g, "");
  if (k.includes("linkedin")) return "linkedin";
  if (k === "x" || k.includes("twitter")) return "x";
  if (k.includes("instagram") || k === "ig") return "instagram";
  if (k.includes("blog")) return "blog";
  return "newsletter";
}

function PlatformPost({ p }: { p: P }) {
  const kind = platformKind(p.channel ?? "");
  const content = p.content ?? "";
  if (kind === "x") return <XPost content={content} />;
  if (kind === "linkedin") return <LinkedInPost content={content} />;
  if (kind === "instagram") return <InstagramPost content={content} hook={arr<string>(p.hook_options)[0]} />;
  if (kind === "blog") return <NewsletterPost content={content} label="Blog draft" />;
  return <NewsletterPost content={content} label="Newsletter" />;
}

function XPost({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-line overflow-hidden" style={{ background: "#fff", color: "#0f1419" }}>
      <div className="p-4 flex gap-3">
        <Avatar size={40} bg="#0f1419" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px]">
            <span className="font-semibold">You</span>
            <span style={{ color: "#536471" }}>@you · 2h</span>
            <span className="ml-auto font-bold text-[17px]">𝕏</span>
          </div>
          <p className="mt-1 text-[15px] leading-normal whitespace-pre-wrap">{content}</p>
          <div className="flex items-center justify-between mt-3 max-w-[280px]" style={{ color: "#536471" }}>
            <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>
            <Ico><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Ico>
            <Ico><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5.5 3.5 3.5 7C19 16.65 12 21 12 21Z" /></Ico>
            <Ico><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></Ico>
            <Ico><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" /></Ico>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPost({ content }: { content: string }) {
  return (
    <div className="rounded-xl border border-line overflow-hidden" style={{ background: "#fff", color: "#1d2226" }}>
      <div className="p-4">
        <div className="flex items-center gap-2.5">
          <Avatar size={48} bg="#0a66c2" initial="Y" />
          <div className="leading-tight">
            <p className="text-sm"><span className="font-semibold">You</span> <span style={{ color: "#6b7280" }}>· 1st</span></p>
            <p className="text-xs" style={{ color: "#6b7280" }}>Founder</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>2h · 🌐</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      <div className="flex border-t border-line" style={{ color: "#6b7280" }}>
        {[["M7 10v12", "Like"], ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "Comment"], ["M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3", "Repost"], ["M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z", "Send"]].map(([d, label]) => (
          <span key={label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold"><Ico size={16}><path d={d} /></Ico>{label}</span>
        ))}
      </div>
    </div>
  );
}

function InstagramPost({ content, hook }: { content: string; hook?: string }) {
  const overlay = (hook || content.split(/[.\n]/)[0] || "").slice(0, 80);
  return (
    <div className="rounded-xl border border-line overflow-hidden max-w-sm" style={{ background: "#fff", color: "#121212" }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="grid place-items-center size-8 rounded-full text-white text-xs font-semibold" style={{ background: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)" }}>Y</span>
        <span className="text-sm font-semibold">you</span>
        <span className="ml-auto text-lg leading-none">⋯</span>
      </div>
      <div className="grid place-items-center p-6 text-center" style={{ aspectRatio: "1 / 1", background: "linear-gradient(135deg,#ff8a6b,#ff6b5e 55%,#a794ff)" }}>
        <p className="font-title font-semibold text-white leading-snug" style={{ fontSize: "clamp(18px,4vw,26px)", textShadow: "0 2px 14px rgba(0,0,0,0.25)" }}>{overlay}</p>
      </div>
      <div className="flex items-center gap-4 px-3 py-2.5">
        <Ico size={22}><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5.5 3.5 3.5 7C19 16.65 12 21 12 21Z" /></Ico>
        <Ico size={22}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>
        <Ico size={22}><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" /></Ico>
        <span className="ml-auto"><Ico size={22}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Ico></span>
      </div>
      <div className="px-3 pb-3 text-sm leading-snug">
        <p><span className="font-semibold">you</span> {content}</p>
      </div>
    </div>
  );
}

function NewsletterPost({ content, label }: { content: string; label: string }) {
  const [subject, ...rest] = content.split(/\n/);
  return (
    <div className="rounded-xl border border-line overflow-hidden" style={{ background: "#fff", color: "#1d2226" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#f3f4f6", color: "#6b7280" }}>
        <Ico size={16}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Ico>
        <span className="text-xs">{label} · to your subscribers</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "#9ca3af" }}>Subject</p>
        <p className="font-semibold text-[15px]">{subject}</p>
        {rest.length > 0 && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#374151" }}>{rest.join("\n").trim()}</p>}
      </div>
    </div>
  );
}
