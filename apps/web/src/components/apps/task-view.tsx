import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHint } from "@/components/ui/card";
import { ResultPanel } from "./result-panel";
import { runStatusLabel, when } from "./format";

export type PastTask = {
  id: string; status: string; billed: number; createdAt: string; modelsUsed: string[]; result: unknown; error: string | null;
  appName: string | null; instanceId: string | null; preview: boolean;
};

/** Read-only view of one past run (Calendar links here via /build?task=…). */
export function TaskView({ task, backHref = "/build", backLabel = "Back to Build" }: { task: PastTask; backHref?: string; backLabel?: string }) {
  const r = task.result as { output?: unknown } | null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Past run</p>
          <h2 className="text-2xl font-semibold truncate">{task.appName ?? "A run"}</h2>
        </div>
        <Link href={backHref} className="text-sm text-fg-muted hover:text-fg whitespace-nowrap">{backLabel}</Link>
      </div>
      <Card className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
        <Badge tone={task.status === "done" ? "green" : task.status === "blocked" || task.status === "failed" ? "red" : "amber"}>{runStatusLabel(task.status)}</Badge>
        {task.preview && <Badge tone="amber">Try-out</Badge>}
        <span className="num text-xs">{when(task.createdAt)}</span>
        {task.instanceId && <Link href={`/my-apps?id=${task.instanceId}`} className="text-green hover:underline ml-auto">Open this app →</Link>}
      </Card>
      {r?.output ? <ResultPanel result={task.result as { output?: unknown }} billedUsd={task.billed} modelsUsed={task.modelsUsed} /> : <Card><CardHint>{task.error ? `This run didn't finish: ${task.error}` : "Nothing was saved for this run."}</CardHint></Card>}
    </div>
  );
}
