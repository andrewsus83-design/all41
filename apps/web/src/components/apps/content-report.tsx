"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `content_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Core = { title_options?: string[]; body?: string; takeaway?: string };
type Repurpose = { channel?: string; content?: string; hook_options?: string[] };
type ScheduleItem = { channel?: string; when?: string; piece_ref?: string };
type Source = { ref?: string; quote?: string };
export type ContentReportData = { summary?: string; core?: Core; repurposes?: Repurpose[]; schedule?: ScheduleItem[]; flags?: string[]; sources?: Source[]; confidence?: number };

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

type Brand = { label: string; grad: string; glyph: string };
function brandOf(ch: string): Brand {
  const k = ch.toLowerCase().replace(/[^a-z]/g, "");
  if (k.includes("linkedin")) return { label: "LinkedIn", grad: "linear-gradient(135deg,#0a66c2,#004182)", glyph: "in" };
  if (k === "x" || k.includes("twitter")) return { label: "X", grad: "linear-gradient(135deg,#2b2b2b,#000)", glyph: "𝕏" };
  if (k.includes("instagram") || k === "ig") return { label: "Instagram", grad: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)", glyph: "◙" };
  if (k.includes("news") || k.includes("email")) return { label: "Newsletter", grad: "linear-gradient(135deg,#0e7a4b,#0a5c39)", glyph: "✉" };
  if (k.includes("blog")) return { label: "Blog", grad: "linear-gradient(135deg,#d8402f,#a52818)", glyph: "¶" };
  return { label: ch || "Post", grad: "linear-gradient(135deg,#6b6660,#3a3733)", glyph: "•" };
}

type Piece = { kind: "article" | "post"; label: string; grad: string; glyph: string; title: string; body: string };
function piecesOf(core: Core, reps: Repurpose[]): Piece[] {
  const out: Piece[] = [];
  if (core.body) out.push({ kind: "article", label: "Article", grad: "linear-gradient(135deg,#ff8a6b,#ff6b5e 55%,#a794ff)", glyph: "¶", title: arr<string>(core.title_options)[0] || "The core piece", body: core.body });
  for (const r of reps) {
    const b = brandOf(r.channel ?? "");
    const body = r.content ?? "";
    out.push({ kind: "post", label: b.label, grad: b.grad, glyph: b.glyph, title: (arr<string>(r.hook_options)[0] || body.split(/[.\n]/)[0] || b.label).slice(0, 90), body });
  }
  return out;
}

function download(name: string, text: string) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {}
}

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Fact-checked — every stat traces to a source and the pieces are original." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Fact-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Fact-checked — some claims didn’t line up with the sources; see the flags below." };
  return null;
}

/** Content Pipeline result — a Pinterest-style board of the pieces; click a pin to read, like, share, download. */
export function ContentReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!report || typeof report !== "object") return null;
  const r = report as ContentReportData;
  const core = r.core ?? {};
  const schedule = arr<ScheduleItem>(r.schedule);
  const flags = arr<string>(r.flags);
  const sources = arr<Source>(r.sources);
  const dc = doubleChecked(verification);
  const pieces = piecesOf(core, arr<Repurpose>(r.repurposes));

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="green">{pieces.length} pieces ready</Badge>
          <span className="text-sm text-fg-muted">A week of content from one idea — tap any pin to read, save or share.</span>
        </div>
        <div className="flex items-center gap-2">{isMock && <Badge tone="amber">sample</Badge>}<ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} /></div>
      </div>
      {dc && <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}><span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />{dc.text}</p>}

      {/* the board — masonry of pins */}
      <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
        {pieces.map((p, i) => {
          const h = 150 + ((i * 37) % 90); // varied heights → real masonry
          return (
            <button key={i} type="button" onClick={() => setOpenIdx(i)} className="group mb-3 block w-full break-inside-avoid squircle rounded-4 overflow-hidden border border-line text-left hover:border-line-strong transition">
              <div className="relative p-4 flex items-end" style={{ background: p.grad, minHeight: h }}>
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur px-2.5 py-1 text-xs font-medium text-white">{p.label}</span>
                <p className="font-title font-semibold text-white leading-snug" style={{ fontSize: "clamp(14px,1.4vw,18px)", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>{p.title}</p>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-bg-elev">
                <span className="text-xs text-fg-faint truncate">{p.body.slice(0, 44)}…</span>
                <span className="text-fg-faint group-hover:text-fg transition">↗</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* schedule */}
      {schedule.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-lg font-medium">Your posting week</h3>
          <div className="flex flex-wrap gap-2">
            {schedule.map((s, i) => {
              const b = brandOf(s.channel ?? "");
              return (
                <div key={i} className="squircle rounded-3 border border-line bg-bg-elev px-4 py-2.5 flex items-center gap-2.5">
                  <span className="grid place-items-center size-6 rounded-full text-white text-xs font-bold" style={{ background: b.grad }}>{b.glyph}</span>
                  <div className="leading-tight"><p className="text-xs text-fg-faint">{s.when}</p><p className="text-sm font-title font-medium">{b.label}</p></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* flags + sources */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before you post</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}
      {sources.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-1.5 text-sm">{sources.map((s, i) => <li key={i} className="flex gap-3"><span className="num text-fg-faint shrink-0">{s.ref}</span><span className="text-fg-muted">“{s.quote}”</span></li>)}</ul>
        </section>
      )}

      {openIdx !== null && pieces[openIdx] && <Lightbox piece={pieces[openIdx]} onClose={() => setOpenIdx(null)} />}
    </div>
  );
}

function ActBtn({ on, active, children }: { on: () => void; active?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={on} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2 text-sm font-title font-medium border transition", active ? "border-green/50 text-green bg-green-soft" : "border-line text-fg-muted hover:text-fg hover:bg-bg-elev-2")}>{children}</button>;
}

function Lightbox({ piece, onClose }: { piece: Piece; onClose: () => void }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const share = async () => {
    try { if (navigator.share) await navigator.share({ text: piece.body }); else { await navigator.clipboard.writeText(piece.body); setCopied(true); setTimeout(() => setCopied(false), 1500); } } catch {}
  };
  return (
    <div className="fixed inset-0 z-[92] bg-fg/50 flex items-stretch sm:items-center justify-center p-0 sm:p-6 scene-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={piece.title} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-bg sm:squircle sm:rounded-5 border border-line shadow-lift flex flex-col overflow-hidden h-full sm:h-auto sm:max-h-[90vh]">
        <div className="shrink-0 flex items-center gap-2.5 p-3 border-b border-line">
          <span className="grid place-items-center size-8 rounded-full text-white text-sm font-bold" style={{ background: piece.grad }}>{piece.glyph}</span>
          <span className="font-title font-medium text-sm">{piece.label}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto size-9 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition">✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-5 text-center text-white" style={{ background: piece.grad }}>
            <p className="font-title font-semibold leading-snug" style={{ fontSize: "clamp(18px,2.4vw,24px)", textShadow: "0 2px 14px rgba(0,0,0,0.3)" }}>{piece.title}</p>
          </div>
          <div className="p-5">
            <p className="text-xs uppercase tracking-wide text-fg-faint mb-2">Full {piece.kind === "article" ? "article" : "post"}</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{piece.body}</p>
          </div>
        </div>
        <div className="shrink-0 border-t border-line p-3 flex items-center gap-2">
          <ActBtn on={() => setVote(vote === "up" ? null : "up")} active={vote === "up"}>👍 Like</ActBtn>
          <ActBtn on={() => setVote(vote === "down" ? null : "down")} active={vote === "down"}>👎</ActBtn>
          <ActBtn on={share}>{copied ? "Copied ✓" : "🔗 Share"}</ActBtn>
          <ActBtn on={() => download(`${piece.label.toLowerCase()}-post.txt`, piece.body)}>⬇ Save</ActBtn>
        </div>
      </div>
    </div>
  );
}
