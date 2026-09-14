"use client";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `clip_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type SourceVideo = { provider?: string; id?: string; title?: string; author?: string };
type DimScores = { hook?: number; pacing?: number; engagement?: number };
type Clip = {
  title?: string;
  start_sec?: number;
  end_sec?: number;
  duration_sec?: number;
  virality_score?: number;
  dimension_scores?: DimScores;
  hook_type?: string;
  why?: string;
  caption?: string;
  render_category?: "A" | "B";
  platform_fit?: string[];
  clip_file?: string;
  caption_file?: string;
  status?: "ready" | "render_pending";
};
type Dropped = { moment?: string; reason?: string };
type Source = { ref?: string; quote?: string };
export type ClipReportData = {
  summary?: string;
  source_video?: SourceVideo;
  clips?: Clip[];
  dropped?: Dropped[];
  render_note?: string;
  flags?: string[];
  sources?: Source[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const fmt = (sec: unknown) => { const s = Math.max(0, Math.round(Number(sec) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const scoreTone = (n: number): "green" | "amber" | "red" => (n >= 75 ? "green" : n >= 55 ? "amber" : "red");
const scoreBand = (n: number) => (n >= 75 ? "Post first" : n >= 55 ? "Secondary" : "Review");

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  const conflicts = arr<string>(v.conflicts).length;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Checked against the transcript — every caption reflects what was actually said." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Checked — a couple of captions couldn’t be confirmed against the transcript; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: `Checked — ${conflicts} caption${conflicts === 1 ? "" : "s"} may drift from what was said; see the flags below.` };
  return null;
}

function ScoreDial({ score }: { score: number }) {
  const tone = scoreTone(score);
  const color = tone === "green" ? "var(--green)" : tone === "amber" ? "var(--amber)" : "var(--coral)";
  const deg = Math.round((Math.min(99, Math.max(0, score)) / 99) * 360);
  return (
    <div className="relative shrink-0 size-16" role="img" aria-label={`Virality ${score} of 99`}>
      <div className="size-16 rounded-full" style={{ background: `conic-gradient(${color} ${deg}deg, var(--bg-elev-2) 0deg)` }} />
      <div className="absolute inset-[3px] rounded-full bg-bg-elev flex flex-col items-center justify-center leading-none">
        <span className="num text-lg font-semibold">{score}</span>
        <span className="text-[9px] uppercase tracking-wide text-fg-faint">score</span>
      </div>
    </div>
  );
}

function DimBar({ label, value }: { label: string; value: number }) {
  const v = Math.min(99, Math.max(0, Math.round(value)));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-fg-faint">{label}</span>
        <span className="num text-fg-muted">{v}</span>
      </div>
      <div className="h-1.5 w-full rounded-1 bg-bg-elev-2 overflow-hidden">
        <div className={cn("h-full", scoreTone(v) === "green" ? "bg-green" : scoreTone(v) === "amber" ? "bg-amber" : "bg-coral")} style={{ width: `${(v / 99) * 100}%` }} />
      </div>
    </div>
  );
}

/** Plain-language renderer for a Clip Video run — hero, per-clip cards, honest drops, render note, flags, sources. */
export function ClipReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  const [seek, setSeek] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  if (!report || typeof report !== "object") return null;
  const r = report as ClipReportData;
  const sv = r.source_video;
  const ytId = sv?.provider === "youtube" && sv.id ? sv.id : null;
  const play = (start?: number) => { setSeek(Math.max(0, Math.round(Number(start) || 0))); playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const clips = arr<Clip>(r.clips).slice().sort((a, b) => (Number(b.virality_score) || 0) - (Number(a.virality_score) || 0));
  const dropped = arr<Dropped>(r.dropped);
  const sources = arr<Source>(r.sources);
  const flags = arr<string>(r.flags);
  const dc = doubleChecked(verification);
  const brandedCount = clips.filter((c) => c.render_category === "B").length;

  return (
    <div className="space-y-8">
      {/* HERO — the shortlist, framed honestly */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isMock && <Badge tone="amber">demo run</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
        <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="font-title text-2xl font-medium">
              <span className="num">{clips.length}</span> clip{clips.length === 1 ? "" : "s"} ready
            </h2>
            <p className="text-sm text-fg-muted">
              {brandedCount > 0 ? <><span className="num">{brandedCount}</span> branded · </> : null}
              <span className="num">{clips.length - brandedCount}</span> plain
            </p>
          </div>
          {r.summary && <p className="text-lg leading-relaxed text-fg-muted">{r.summary}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-green" />Post first <span className="text-fg-faint">75+</span></span>
            <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-amber" />Secondary <span className="text-fg-faint">55–74</span></span>
            <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-coral" />Review <span className="text-fg-faint">under 55</span></span>
          </div>
        </section>
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </div>

      {/* SOURCE VIDEO — the real thing; clips seek into it */}
      {ytId && (
        <section ref={playerRef} className="space-y-2 scroll-mt-6">
          <div className="squircle rounded-4 overflow-hidden border border-line-strong bg-black" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              key={seek ?? "start"}
              src={`https://www.youtube.com/embed/${ytId}?rel=0${seek != null ? `&start=${seek}&autoplay=1` : ""}`}
              title={sv?.title ?? "Source video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          </div>
          <p className="text-xs text-fg-faint px-1">
            Source: <span className="text-fg-muted">{sv?.title}</span>{sv?.author ? <> · {sv.author}</> : null} — clip a moment below to jump to it{seek != null ? <> · playing from <span className="num">{fmt(seek)}</span></> : null}.
          </p>
        </section>
      )}

      {/* CLIPS — one card each, best first */}
      {clips.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Your clips</h3>
          <div className="space-y-3">
            {clips.map((c, i) => {
              const score = Math.round(Number(c.virality_score) || 0);
              const ds = c.dimension_scores ?? {};
              return (
                <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-6">
                  <div className="flex gap-5">
                    <ScoreDial score={score} />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 space-y-1">
                          {c.title && <p className="font-title text-lg font-medium leading-snug">{c.title}</p>}
                          <p className="flex flex-wrap items-center gap-2 text-xs text-fg-faint">
                            <Badge tone={scoreTone(score)}>{scoreBand(score)}</Badge>
                            {c.hook_type && <span className="inline-flex items-center h-6 px-2 rounded-1 bg-bg-elev-2 text-fg-muted">{c.hook_type}</span>}
                            <Badge tone={c.render_category === "B" ? "violet" : undefined}>{c.render_category === "B" ? "Branded captions" : "Plain cut"}</Badge>
                            {ytId ? (
                              <button type="button" onClick={() => play(c.start_sec)} className="num inline-flex items-center gap-1 h-6 px-2 rounded-1 bg-coral-soft text-coral hover:bg-coral hover:text-white transition font-medium">▶ {fmt(c.start_sec)}–{fmt(c.end_sec)}</button>
                            ) : (
                              <span className="num">{fmt(c.start_sec)}–{fmt(c.end_sec)}</span>
                            )}
                            {typeof c.duration_sec === "number" && <span className="num">{Math.round(c.duration_sec)}s</span>}
                          </p>
                        </div>
                        {c.status === "render_pending" && <Badge tone="amber">render pending</Badge>}
                      </div>

                      {c.caption && <p className="text-fg-muted leading-relaxed">“{c.caption}”</p>}
                      {c.why && <p className="text-sm text-green">{c.why}</p>}

                      {(typeof ds.hook === "number" || typeof ds.pacing === "number" || typeof ds.engagement === "number") && (
                        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3 pt-1">
                          <DimBar label="Hook" value={Number(ds.hook) || 0} />
                          <DimBar label="Pacing" value={Number(ds.pacing) || 0} />
                          <DimBar label="Engagement" value={Number(ds.engagement) || 0} />
                        </div>
                      )}

                      {arr<string>(c.platform_fit).length > 0 && (
                        <p className="flex flex-wrap items-center gap-2 text-xs text-fg-faint pt-1">
                          Best for:
                          {arr<string>(c.platform_fit).map((p, j) => (
                            <span key={j} className="inline-flex items-center h-6 px-2 rounded-1 bg-bg-elev-2 text-fg-muted">{p}</span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* DROPPED — the honesty layer (industry discards ~40%) */}
      {dropped.length > 0 && (
        <section className="squircle rounded-4 border border-line bg-bg-elev-2 p-6 space-y-2">
          <p className="font-title text-lg font-medium">Moments we left out <span className="num text-sm text-fg-faint font-normal">{dropped.length}</span></p>
          <p className="text-sm text-fg-muted">A tight shortlist beats a padded one — these didn’t clear the bar:</p>
          <ul className="space-y-1.5 text-sm">
            {dropped.map((d, i) => (
              <li key={i} className="flex gap-3">
                {d.moment && <span className="num text-fg-faint shrink-0">{d.moment}</span>}
                <span className="text-fg-muted">{d.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FLAGS — check before you post */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before you post</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {/* RENDER NOTE — what’s live vs pending */}
      {r.render_note && (
        <p className="text-xs text-fg-faint leading-relaxed px-1">{r.render_note}</p>
      )}

      {/* SOURCES */}
      {sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span>
                <span className="text-fg-muted">“{s.quote}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
