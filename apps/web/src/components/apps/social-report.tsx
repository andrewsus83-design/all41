import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `social_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Metric = { label?: string; value?: string; sub?: string };
type TopPost = { platform?: string; type?: string; content?: string; engagement_rate?: string; reach?: string; why?: string[] };
type BottomPost = { platform?: string; type?: string; content?: string; engagement_rate?: string; problem?: string; fix?: string };
type ContentType = { type?: string; count?: number; avg_engagement?: number; avg_reach?: number; trend?: string; verdict?: string };
type HeatRow = { time?: string; mon?: number; tue?: number; wed?: number; thu?: number; fri?: number; sat?: number; sun?: number };
type PostingTimes = { finding?: string; best_window?: string; timezone?: string; heatmap?: HeatRow[] };
type GrowthPoint = { label?: string; followers?: number; net_change?: number };
type Growth = { finding?: string; points?: GrowthPoint[] };
type PlatformRow = { platform?: string; posts?: number; reach?: string; engagement_rate?: string; follower_growth?: string; best_format?: string; worst_format?: string; best_time?: string };
type Platforms = { synthesis?: string; rows?: PlatformRow[] };
type Rec = { title?: string; priority?: "high" | "medium" | "low"; body?: string; action?: string };
type Source = { ref?: string; quote?: string };
export type SocialReportData = {
  summary?: string; metrics?: Metric[]; top_posts?: TopPost[]; bottom_posts?: BottomPost[]; content_types?: ContentType[];
  posting_times?: PostingTimes; growth?: Growth; platforms?: Platforms; recommendations?: Rec[]; flags?: string[]; sources?: Source[]; confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const DAYS: [keyof HeatRow, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const verdictTone: Record<string, "green" | "amber" | "red" | "neutral"> = { best: "green", good: "green", ok: "amber", flat: "neutral", drop: "red" };

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Fact-checked — every insight traces to your actual post metrics." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Fact-checked — a couple of points couldn’t be confirmed against the data; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Fact-checked — some points didn’t line up with the data; see the flags below." };
  return null;
}

/** Social Pulse result — a full performance report: metrics, content-type + timing + growth, platforms, posts, recs. */
export function SocialReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  if (!report || typeof report !== "object") return null;
  const r = report as SocialReportData;
  const metrics = arr<Metric>(r.metrics);
  const top = arr<TopPost>(r.top_posts);
  const bottom = arr<BottomPost>(r.bottom_posts);
  const types = arr<ContentType>(r.content_types);
  const pt = r.posting_times ?? {};
  const heat = arr<HeatRow>(pt.heatmap);
  const growth = r.growth ?? {};
  const points = arr<GrowthPoint>(growth.points);
  const platforms = r.platforms ?? {};
  const prows = arr<PlatformRow>(platforms.rows);
  const recs = arr<Rec>(r.recommendations);
  const flags = arr<string>(r.flags);
  const sources = arr<Source>(r.sources);
  const dc = doubleChecked(verification);

  const maxEng = Math.max(6, ...types.map((t) => Number(t.avg_engagement) || 0));
  const maxFollowers = Math.max(1, ...points.map((p) => Number(p.followers) || 0));
  const minFollowers = Math.min(...points.map((p) => Number(p.followers) || 0), maxFollowers);
  const heatMax = Math.max(1, ...heat.flatMap((row) => DAYS.map(([k]) => Number(row[k]) || 0)));

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="green">Performance report</Badge>
          <span className="text-sm text-fg-muted">What&apos;s working across your socials.</span>
        </div>
        <div className="flex items-center gap-2">{isMock && <Badge tone="amber">sample</Badge>}<ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} /></div>
      </div>
      {r.summary && <p className="text-lg leading-relaxed text-fg-muted">{r.summary}</p>}
      {dc && <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}><span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />{dc.text}</p>}

      {/* metric cards */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="squircle rounded-4 bg-bg-elev-2 p-5 space-y-1">
              <p className="text-xs uppercase tracking-wide text-fg-faint">{m.label}</p>
              <p className="text-3xl font-title font-semibold leading-none">{m.value}</p>
              {m.sub && <p className="text-xs text-fg-muted num">{m.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* performance by content type */}
      {types.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Performance by content type</h3>
          <div className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-3">
            {types.map((t, i) => {
              const eng = Number(t.avg_engagement) || 0;
              const tone = verdictTone[String(t.verdict).toLowerCase()] ?? "neutral";
              const barColor = tone === "green" ? "bg-green" : tone === "amber" ? "bg-amber" : tone === "red" ? "bg-coral" : "bg-fg-faint";
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 min-w-0">
                    <p className="text-sm font-medium truncate">{t.type}</p>
                    {typeof t.count === "number" && <p className="text-xs text-fg-faint num">{t.count} posts{t.trend ? ` · ${t.trend}` : ""}</p>}
                  </div>
                  <div className="flex-1 h-6 rounded-full bg-bg-elev-2 overflow-hidden">
                    <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, (eng / maxEng) * 100)}%` }} />
                  </div>
                  <span className="num text-sm font-medium w-14 text-right">{eng.toFixed(1)}%</span>
                  {t.verdict && <Badge tone={tone === "neutral" ? undefined : tone}>{t.verdict}</Badge>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* posting-time heatmap */}
      {heat.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Best times to post{pt.timezone ? <span className="text-sm text-fg-faint font-normal"> · {pt.timezone}</span> : null}</h3>
          <div className="overflow-x-auto squircle rounded-4 border border-line">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
                  <th className="text-left font-medium py-2.5 px-3">Time</th>
                  {DAYS.map(([, label]) => <th key={label} className="font-medium py-2.5 px-2 text-center">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {heat.map((row, i) => (
                  <tr key={i} className="border-t border-line bg-bg-elev">
                    <td className="py-2 px-3 text-fg-muted num whitespace-nowrap">{row.time}</td>
                    {DAYS.map(([k, label]) => {
                      const v = Number(row[k]) || 0;
                      const a = Math.max(0, Math.min(0.9, (v / heatMax) * 0.9));
                      return <td key={label} className="py-2 px-2 text-center num text-xs" style={{ background: `rgba(14,122,75,${a})`, color: a > 0.5 ? "#fff" : "var(--fg-muted)" }}>{v ? `${v.toFixed(1)}` : "·"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pt.finding && <p className="text-sm text-green leading-relaxed">{pt.finding}</p>}
        </section>
      )}

      {/* follower growth */}
      {points.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Follower growth</h3>
          <div className="squircle rounded-4 border border-line bg-bg-elev p-5">
            <div className="flex items-end gap-3 h-32">
              {points.map((p, i) => {
                const f = Number(p.followers) || 0;
                const h = maxFollowers > minFollowers ? 12 + ((f - minFollowers) / (maxFollowers - minFollowers)) * 88 : 60;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                    {typeof p.net_change === "number" && <span className="text-xs text-green num">+{p.net_change}</span>}
                    <div className="w-full rounded-t-2 bg-green/70" style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              {points.map((p, i) => <span key={i} className="flex-1 text-center text-xs text-fg-faint truncate">{p.label}</span>)}
            </div>
          </div>
          {growth.finding && <p className="text-sm text-green leading-relaxed">{growth.finding}</p>}
        </section>
      )}

      {/* cross-platform comparison */}
      {prows.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Platform by platform</h3>
          <div className={cn("grid gap-3", prows.length >= 2 ? "sm:grid-cols-2" : "")}>
            {prows.map((p, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2">
                <p className="font-title text-lg font-medium">{p.platform}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {p.posts !== undefined && <><dt className="text-fg-faint">Posts</dt><dd className="num text-right">{p.posts}</dd></>}
                  {p.reach && <><dt className="text-fg-faint">Reach</dt><dd className="num text-right">{p.reach}</dd></>}
                  {p.engagement_rate && <><dt className="text-fg-faint">Engagement</dt><dd className="num text-right">{p.engagement_rate}</dd></>}
                  {p.follower_growth && <><dt className="text-fg-faint">Growth</dt><dd className="num text-right text-green">{p.follower_growth}</dd></>}
                  {p.best_format && <><dt className="text-fg-faint">Best format</dt><dd className="text-right">{p.best_format}</dd></>}
                  {p.best_time && <><dt className="text-fg-faint">Best time</dt><dd className="text-right num">{p.best_time}</dd></>}
                </dl>
              </div>
            ))}
          </div>
          {platforms.synthesis && (
            <div className="squircle rounded-4 border border-green/30 bg-green-soft p-5">
              <p className="text-sm leading-relaxed">{platforms.synthesis}</p>
            </div>
          )}
        </section>
      )}

      {/* top posts */}
      {top.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Top performers</h3>
          <div className="space-y-3">
            {top.map((p, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-5">
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center size-9 rounded-full bg-green-soft text-green font-title font-semibold shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-fg-faint">
                      {p.platform && <Badge>{p.platform}</Badge>}
                      {p.type && <span className="inline-flex items-center h-6 px-2 rounded-1 bg-bg-elev-2 text-fg-muted">{p.type}</span>}
                      <span className="num text-green font-medium text-sm">{p.engagement_rate}</span>
                      {p.reach && <span className="num">· {p.reach} reach</span>}
                    </div>
                    {p.content && <p className="text-sm leading-snug">{p.content}</p>}
                    {arr<string>(p.why).length > 0 && (
                      <ul className="space-y-1 pt-1">
                        {arr<string>(p.why).map((w, j) => <li key={j} className="text-sm text-fg-muted flex gap-2"><span className="text-green shrink-0">✓</span>{w}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* bottom posts + fixes */}
      {bottom.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Underperformers — and the fix</h3>
          <div className="space-y-3">
            {bottom.map((p, i) => (
              <div key={i} className="squircle rounded-4 border border-amber/40 bg-amber-soft/40 p-5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs text-fg-faint">
                  {p.platform && <Badge tone="amber">{p.platform}</Badge>}
                  {p.type && <span className="inline-flex items-center h-6 px-2 rounded-1 bg-bg-elev-2 text-fg-muted">{p.type}</span>}
                  <span className="num text-coral font-medium text-sm">{p.engagement_rate}</span>
                </div>
                {p.content && <p className="text-sm font-medium">{p.content}</p>}
                {p.problem && <p className="text-sm text-fg-muted">{p.problem}</p>}
                {p.fix && <p className="text-sm text-green flex gap-2"><span className="shrink-0 font-medium">Fix:</span>{p.fix}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* recommendations */}
      {recs.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">Do these next</h3>
          <div className="space-y-3">
            {recs.map((rc, i) => {
              const tone = rc.priority === "high" ? "red" : rc.priority === "medium" ? "amber" : "green";
              return (
                <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="num text-fg-faint font-title font-semibold">{i + 1}</span>
                    <p className="font-title text-lg font-medium leading-snug flex-1 min-w-0">{rc.title}</p>
                    {rc.priority && <Badge tone={tone}>{rc.priority} impact</Badge>}
                  </div>
                  {rc.body && <p className="text-sm text-fg-muted leading-relaxed">{rc.body}</p>}
                  {rc.action && <p className="text-sm"><span className="inline-flex items-center gap-1.5 squircle rounded-full border border-green/40 bg-green-soft text-green px-3 py-1.5 font-title font-medium">→ {rc.action}</span></p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* flags */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Good to know</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}

      {/* sources */}
      {sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => <li key={i} className="flex gap-3"><span className="num text-fg-faint shrink-0 max-w-[12rem] truncate">{s.ref}</span><span className="text-fg-muted">“{s.quote}”</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
