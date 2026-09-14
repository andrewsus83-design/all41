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

const channelTone: Record<string, "sky" | "violet" | "coral" | "green" | "amber" | "neutral"> = {
  linkedin: "sky", x: "neutral", twitter: "neutral", instagram: "violet", ig: "violet", blog: "coral", email: "green", newsletter: "green",
};
const toneFor = (ch: string) => channelTone[ch.toLowerCase().replace(/[^a-z]/g, "")] ?? "neutral";

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Fact-checked — every stat traces to a source and the pieces are original." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Fact-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Fact-checked — some claims didn’t line up with the sources; see the flags below." };
  return null;
}

/** Plain-language renderer for a Content Pipeline run — core piece, channel-native repurposes, schedule, flags. */
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

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isMock && <Badge tone="amber">demo run</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
        <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-3">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="font-title text-2xl font-medium">Your content set</h2>
            <p className="text-sm text-fg-muted"><span className="num">{repurposes.length + (core.body ? 1 : 0)}</span> pieces</p>
          </div>
          {r.summary && <p className="text-lg leading-relaxed text-fg-muted">{r.summary}</p>}
        </section>
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </div>

      {/* CORE PIECE */}
      {(core.body || titles.length > 0) && (
        <section className="squircle rounded-4 border border-coral/30 bg-coral-soft/40 p-6 space-y-3">
          <p className="text-xs uppercase tracking-wide text-coral">Core piece</p>
          {titles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-fg-faint">Title options (test them)</p>
              <ul className="space-y-1 text-sm">
                {titles.map((t, i) => <li key={i} className="font-title font-medium">{t}</li>)}
              </ul>
            </div>
          )}
          {core.body && <div className="text-fg-muted leading-relaxed whitespace-pre-wrap text-sm border-t border-line/60 pt-3">{core.body}</div>}
          {core.takeaway && <p className="text-sm text-green border-t border-line/60 pt-3"><span className="text-fg-faint">Takeaway: </span>{core.takeaway}</p>}
        </section>
      )}

      {/* REPURPOSES — channel-native */}
      {repurposes.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Channel-native repurposes</h3>
          <div className="space-y-3">
            {repurposes.map((p, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.channel && <Badge tone={toneFor(p.channel)}>{p.channel}</Badge>}
                </div>
                {p.content && <div className="text-fg-muted leading-relaxed whitespace-pre-wrap">{p.content}</div>}
                {arr<string>(p.hook_options).length > 0 && (
                  <div className="border-t border-line/60 pt-2 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-fg-faint">Hook options</p>
                    <ul className="space-y-1 text-sm text-fg-muted">
                      {arr<string>(p.hook_options).map((h, j) => <li key={j} className="flex gap-2"><span className="text-fg-faint shrink-0">•</span>{h}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SCHEDULE */}
      {schedule.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Suggested posting order</h3>
          <div className="overflow-x-auto squircle rounded-4 border border-line">
            <table className="w-full text-sm border-collapse">
              <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
                <tr><th className="text-left font-medium py-3 px-4">When</th><th className="text-left font-medium py-3 px-4">Channel</th></tr>
              </thead>
              <tbody>
                {schedule.map((s, i) => (
                  <tr key={i} className="border-t border-line bg-bg-elev">
                    <td className="py-3 px-4 text-fg-muted">{s.when}</td>
                    <td className="py-3 px-4">{s.channel && <Badge tone={toneFor(s.channel)}>{s.channel}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FLAGS */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before you post</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
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
