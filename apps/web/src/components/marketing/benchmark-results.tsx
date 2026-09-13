import { Badge } from "@/components/ui/badge";
import { N } from "@/components/marketing/primitives";

export type PathKey = "regular_ai" | "all41" | "professional";

export const PATH_LABEL: Record<PathKey, string> = {
  regular_ai: "Regular AI",
  all41: "all41",
  professional: "Professional",
};
const PATH_SUB: Record<PathKey, string> = {
  regular_ai: "One strong general model, single shot",
  all41: "Our SEO & GEO Optimizer app",
  professional: "Agency-grade stand-in",
};

export type PathAgg = {
  path: PathKey;
  overall: number | null;
  criteria: { completeness: number | null; accuracy: number | null; actionability: number | null; depth: number | null };
  judges: number;
  ran: boolean;
};

const CRITERIA: Array<{ key: keyof PathAgg["criteria"]; label: string }> = [
  { key: "completeness", label: "Completeness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "actionability", label: "Actionability" },
  { key: "depth", label: "Depth" },
];

const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

/** Blind-judged scoreboard for one published, live benchmark. Winner is highest average overall. */
export function BenchmarkResults({ paths }: { paths: PathAgg[] }) {
  const scored = paths.filter((p) => p.overall != null);
  const best = scored.length ? Math.max(...scored.map((p) => p.overall as number)) : null;
  const ranked = [...paths].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  return (
    <div className="space-y-8">
      {/* overall bars */}
      <div className="space-y-4">
        {ranked.map((p) => {
          const isWinner = best != null && p.overall === best;
          const pct = p.overall != null ? Math.max(4, (p.overall / 10) * 100) : 0;
          return (
            <div key={p.path} className="squircle rounded-4 border border-line bg-bg-elev p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="space-y-0.5">
                  <p className="font-title text-lg flex items-center gap-2">
                    <span className={p.path === "all41" ? "text-green" : ""}>{PATH_LABEL[p.path]}</span>
                    {isWinner ? <Badge tone="green">highest score</Badge> : null}
                    {p.path === "all41" ? <Badge tone="neutral">that&apos;s us</Badge> : null}
                  </p>
                  <p className="text-xs text-fg-faint">{PATH_SUB[p.path]}</p>
                </div>
                <p className="text-right">
                  <N className="text-2xl">{fmt(p.overall)}</N>
                  <span className="text-fg-faint text-sm"> / 10</span>
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-bg-elev-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isWinner || p.path === "all41" ? "bg-green" : "bg-fg-faint"}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* per-criterion breakdown */}
      <div className="squircle rounded-4 border border-line bg-bg-elev overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="font-title text-lg">How the judges scored, by criterion</p>
          <p className="text-xs text-fg-faint mt-1">Average of the independent judges, 0–10 per criterion.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-fg-faint">
              <tr className="border-b border-line">
                <th className="text-left px-5 py-3 font-medium">Path</th>
                {CRITERIA.map((c) => <th key={c.key} className="text-right px-5 py-3 font-medium">{c.label}</th>)}
                <th className="text-right px-5 py-3 font-medium">Overall</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p) => (
                <tr key={p.path} className={p.path === "all41" ? "bg-green-soft" : "border-b border-line last:border-0"}>
                  <td className="px-5 py-3">
                    <span className={p.path === "all41" ? "text-green" : ""}>{PATH_LABEL[p.path]}</span>
                  </td>
                  {CRITERIA.map((c) => <td key={c.key} className="px-5 py-3 text-right num">{fmt(p.criteria[c.key])}</td>)}
                  <td className="px-5 py-3 text-right num">{fmt(p.overall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
