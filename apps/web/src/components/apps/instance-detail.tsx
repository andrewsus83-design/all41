"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHint } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { pauseInstance, resumeInstance, deleteInstance, renameInstance } from "@/app/(app)/my-apps/actions";
import { useAppRun } from "./use-app-run";
import { RunProgress } from "./run-progress";
import { ResultPanel } from "./result-panel";
import { EditSection } from "./edit-section";
import { DataSection } from "./data-section";
import { relative, runStatusLabel, scheduleLabel, statusLabel, statusTone, targetLabel, when } from "./format";
import type { DataLists, InstanceDetail, RunSummary } from "./types";

export function InstanceDetailPanel({ detail, data, balance }: { detail: InstanceDetail; data: DataLists; balance: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(detail.name);
  const [editingName, setEditingName] = useState(false);
  const [viewing, setViewing] = useState<RunSummary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const stream = useAppRun();

  const latest = detail.runs.find((r) => r.status === "done" && r.result) ?? null;
  const shown = stream.result ? { result: stream.result.result, billed: stream.result.billedUsd, models: undefined as string[] | undefined, label: "Latest result" } : viewing ? { result: viewing.result, billed: viewing.billed, models: viewing.modelsUsed, label: `Run from ${when(viewing.createdAt)}` } : latest ? { result: latest.result, billed: latest.billed, models: latest.modelsUsed, label: "Latest result" } : null;

  const act = (fn: () => Promise<unknown>, after?: string) =>
    start(async () => {
      setMsg(null);
      const r = (await fn()) as { ok?: boolean; error?: string } | undefined;
      if (r && r.ok === false) setMsg(r.error ?? "That didn't work.");
      else if (after) setMsg(after);
      router.refresh();
    });

  function saveName() {
    setEditingName(false);
    if (name.trim() && name.trim() !== detail.name) act(() => renameInstance(detail.id, name), "Renamed.");
    else setName(detail.name);
  }

  async function runNow() {
    setViewing(null);
    await stream.run(detail.id, { preview: false });
    router.refresh();
  }

  const insufficient = balance < detail.estCostUsd;

  return (
    <div className="space-y-8">
      {/* header */}
      <header className="space-y-4">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="text-4xl leading-none">{detail.icon}</span>
          <div className="min-w-0 flex-1 space-y-1">
            {editingName ? (
              <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex gap-2 max-w-md">
                <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} aria-label="App name" />
              </form>
            ) : (
              <button type="button" onClick={() => setEditingName(true)} className="text-3xl font-semibold font-title text-left hover:text-amber transition truncate max-w-full" title="Click to rename">{detail.name}</button>
            )}
            <p className="text-sm text-fg-muted">{detail.appName} · {scheduleLabel(detail.schedule)}, {targetLabel(detail.outputTarget)}{detail.status === "active" && detail.nextRunAt ? <> · next run <span className="num">{relative(detail.nextRunAt)}</span></> : null}</p>
          </div>
          <Badge tone={statusTone(detail.status)}>{statusLabel(detail.status)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" phase="green" disabled={pending || stream.running || insufficient} onClick={runNow}>{stream.running ? "Running…" : <>Run now · ≈ <Money usd={detail.estCostUsd} /></>}</Button>
          {detail.status === "paused" ? (
            <Button size="sm" phase="ghost" disabled={pending} onClick={() => act(() => resumeInstance(detail.id), "Resumed.")}>Resume</Button>
          ) : detail.status === "active" ? (
            <Button size="sm" phase="ghost" disabled={pending} onClick={() => act(() => pauseInstance(detail.id), "Paused.")}>Pause</Button>
          ) : null}
          <Button size="sm" phase="ghost" className="text-red border-red/30" disabled={pending} onClick={() => { if (confirm(`Delete “${detail.name}”? Past runs stay in your history.`)) start(async () => { await deleteInstance(detail.id); router.push("/my-apps"); router.refresh(); }); }}>Delete</Button>
          {insufficient && <span className="text-xs text-amber">Top up to run this — <Link href="/settings/billing" className="underline">add credit</Link></span>}
          {msg && <span className="text-xs text-fg-muted">{msg}</span>}
        </div>
      </header>

      {(stream.running || stream.frames.length > 0) && <RunProgress frames={stream.frames} running={stream.running} />}

      {/* latest result */}
      {shown ? (
        <div className="space-y-2">
          {viewing && !stream.result && <button type="button" className="text-xs text-fg-muted hover:text-fg px-2" onClick={() => setViewing(null)}>← Back to latest</button>}
          <ResultPanel title={shown.label} result={shown.result as { output?: unknown }} billedUsd={shown.billed} modelsUsed={shown.models} />
        </div>
      ) : (
        !stream.running && <Card><CardHint>No result yet — tap <b>Run now</b> to make one.</CardHint></Card>
      )}

      {/* run history */}
      <section className="space-y-3">
        <h3 className="text-lg font-title">Run history <span className="num text-fg-faint">{detail.runs.length}</span></h3>
        {detail.runs.length === 0 ? (
          <p className="text-sm text-fg-faint">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-3 squircle overflow-hidden">
            {detail.runs.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => { stream.reset(); setViewing(r); }} className={cn("w-full flex items-center gap-4 px-5 py-3 text-sm text-left transition hover:bg-bg-elev", viewing?.id === r.id && "bg-bg-elev-2")}>
                  <span className="num text-fg-muted w-40 shrink-0">{when(r.createdAt)}</span>
                  <Badge tone={r.status === "done" ? "green" : r.status === "blocked" || r.status === "failed" ? "red" : "amber"}>{runStatusLabel(r.status)}</Badge>
                  {r.preview && <span className="text-xs text-fg-faint">try-out</span>}
                  <span className="ml-auto text-fg-muted">billed <Money usd={r.billed} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditSection detail={detail} />
      <DataSection detail={detail} lists={data} />
    </div>
  );
}
