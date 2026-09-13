import Link from "next/link";
import { ResultView } from "@/components/result-view";
import { Money } from "@/components/ui/money";
import { whichAi } from "./format";

type TaskResult = {
  output?: unknown;
  schema?: string;
  isMock?: boolean;
  modelsUsed?: string[];
  preview?: boolean;
  verification?: { verdict?: string; conflicts?: string[] } | null;
  crew?: { crew_id?: string; seoRunId?: string } | null;
} | null | undefined;

/** The result of one run, plus the one small line that says which AI did the work, and what it cost. */
export function ResultPanel({ result, billedUsd, modelsUsed, title }: { result: TaskResult; billedUsd: number | null; modelsUsed?: string[]; title?: string }) {
  const r = (result ?? {}) as NonNullable<TaskResult>;
  const models = modelsUsed ?? r.modelsUsed ?? [];
  const runId = r.crew?.seoRunId;
  const hasOutput = !!r.output && typeof r.output === "object";
  const isProposal = r.schema === "proposal_report" || (hasOutput && "compliance_matrix" in (r.output as object));
  const isClip = r.schema === "clip_report" || (hasOutput && "render_note" in (r.output as object));
  // SEO and Proposal have dedicated detail pages; Clip renders fully inline (no separate page).
  const detailHref = runId && !isClip ? (isProposal ? `/my-apps/proposal/${runId}` : `/my-apps/audit/${runId}`) : null;
  return (
    <div className="space-y-3">
      {title && <p className="text-xs uppercase tracking-wide text-fg-faint">{title}</p>}
      <ResultView output={r.output} schema={r.schema} isMock={r.isMock} verification={r.verification} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2 text-xs text-fg-faint">
        <span>Which AI did the work: {whichAi(models)}</span>
        {billedUsd !== null && <span>Cost: <Money usd={billedUsd} /></span>}
        {detailHref && <Link href={detailHref} className="text-green hover:underline ml-auto">{isProposal ? "See the full proposal →" : "See the full audit →"}</Link>}
      </div>
    </div>
  );
}
