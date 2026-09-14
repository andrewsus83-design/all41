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

      {/* REPURPOSES — channel-native post cards */}
      {repurposes.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Ready to post</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {repurposes.map((p, i) => {
              const b = brandOf(p.channel ?? "");
              return (
                <div key={i} className="squircle rounded-4 border border-line bg-bg-elev overflow-hidden flex flex-col">
                  {/* channel header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
                    <span className="grid place-items-center size-8 rounded-full text-white text-sm font-bold shrink-0" style={{ background: b.color }}>{b.glyph}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-title font-medium leading-tight">{b.label}</p>
                      {b.handle && <p className="text-xs text-fg-faint leading-tight">{b.handle}</p>}
                    </div>
                    <div className="ml-auto"><CopyButton text={p.content ?? ""} /></div>
                  </div>
                  {/* post body */}
                  {p.content && <div className="px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap flex-1">{p.content}</div>}
                  {/* alt hooks */}
                  {arr<string>(p.hook_options).length > 0 && (
                    <div className="px-4 py-3 border-t border-line bg-bg-elev-2 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">Alt hooks</p>
                      {arr<string>(p.hook_options).map((h, j) => <p key={j} className="text-sm text-fg-muted flex gap-2"><span className="text-fg-faint shrink-0">•</span>{h}</p>)}
                    </div>
                  )}
                </div>
              );
            })}
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
