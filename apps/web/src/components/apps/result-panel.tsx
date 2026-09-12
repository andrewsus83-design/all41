import { ResultView } from "@/components/result-view";
import { Money } from "@/components/ui/money";
import { whichAi } from "./format";

type TaskResult = { output?: unknown; schema?: string; isMock?: boolean; modelsUsed?: string[]; preview?: boolean } | null | undefined;

/** The result of one run, plus the one small line that says which AI did the work, and what it cost. */
export function ResultPanel({ result, billedUsd, modelsUsed, title }: { result: TaskResult; billedUsd: number | null; modelsUsed?: string[]; title?: string }) {
  const r = (result ?? {}) as NonNullable<TaskResult>;
  const models = modelsUsed ?? r.modelsUsed ?? [];
  return (
    <div className="space-y-3">
      {title && <p className="text-xs uppercase tracking-wide text-fg-faint">{title}</p>}
      <ResultView output={r.output} schema={r.schema} isMock={r.isMock} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2 text-xs text-fg-faint">
        <span>Which AI did the work: {whichAi(models)}</span>
        {billedUsd !== null && <span>Cost: <Money usd={billedUsd} /></span>}
      </div>
    </div>
  );
}
