"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { cn } from "@/lib/cn";
import { createInstanceAndRun, type CreateInstanceResult } from "../actions";

export type ConfigQuestion = { key: string; question: string; type: "text" | "choice" | "multi"; options?: string[]; placeholder?: string };

export function ConfigureClient({ slug, appName, questions }: { slug: string; appName: string; questions: ConfigQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<CreateInstanceResult | null>(null);

  const q = questions[idx];
  const finished = idx >= questions.length;

  function commit(value: string | string[]) {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    setDraft("");
    setMulti([]);
    setIdx(idx + 1);
    if (idx + 1 >= questions.length) {
      start(async () => {
        const r = await createInstanceAndRun(slug, next);
        setDone(r);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* transcript of answered questions */}
      {questions.slice(0, idx).map((qq) => (
        <div key={qq.key} className="space-y-2">
          <p className="text-fg-muted">{qq.question}</p>
          <div className="flex justify-end"><span className="squircle rounded-3 bg-bg-elev-2 border border-line px-5 py-3 max-w-lg">{Array.isArray(answers[qq.key]) ? (answers[qq.key] as string[]).join(", ") : String(answers[qq.key])}</span></div>
        </div>
      ))}

      {!finished && q && (
        <Card className="space-y-5 border-amber/30">
          <CardTitle className="text-2xl">{q.question}</CardTitle>
          {q.type === "text" && (
            <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) commit(draft.trim()); }} className="flex gap-3">
              <Input autoFocus placeholder={q.placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button type="submit" phase="amber" disabled={!draft.trim()}>Next</Button>
            </form>
          )}
          {q.type === "choice" && (
            <div className="flex flex-wrap gap-2">
              {(q.options ?? []).map((o) => (
                <button key={o} type="button" onClick={() => commit(o)} className="squircle h-12 px-6 rounded-2 border border-line-strong bg-bg-elev hover:bg-amber hover:text-black hover:border-transparent font-title font-medium transition">{o}</button>
              ))}
            </div>
          )}
          {q.type === "multi" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((o) => {
                  const on = multi.includes(o);
                  return (
                    <button key={o} type="button" onClick={() => setMulti(on ? multi.filter((x) => x !== o) : [...multi, o])} className={cn("squircle h-12 px-6 rounded-2 border font-title font-medium transition", on ? "bg-amber text-black border-transparent" : "border-line-strong bg-bg-elev hover:bg-bg-elev-2")}>{o}</button>
                  );
                })}
              </div>
              <Button phase="amber" disabled={multi.length === 0} onClick={() => commit(multi)}>Next</Button>
            </div>
          )}
          <CardHint><span className="num">{idx + 1}</span> of <span className="num">{questions.length}</span></CardHint>
        </Card>
      )}

      {finished && !done && (
        <Card className="space-y-2 border-green/30">
          <CardTitle className="text-2xl pulse-soft">Setting up {appName} and running it for the first time…</CardTitle>
          <CardHint>Metered like any task — you only pay for what actually ran.</CardHint>
        </Card>
      )}

      {done && done.ok && (
        <div className="space-y-4">
          <Card className="space-y-2 border-green/30 bg-green-soft">
            <CardTitle className="text-2xl">✅ App ready.</CardTitle>
            <p>First run done — {done.scheduleLabel.toLowerCase()}{done.outputTarget !== "chat" ? `, delivered to ${done.outputTarget}` : ""}. Billed <Money usd={done.billedUsd} />.</p>
            <div className="flex gap-4 text-sm">
              <Link href="/chat" className="text-green underline">Open in Chat</Link>
              <Link href="/my-apps" className="text-fg-muted underline">Back to Apps</Link>
              <span className="num text-fg-faint">task {done.taskId.slice(0, 8)}</span>
            </div>
          </Card>
          <ResultView output={(done.result as { output?: unknown })?.output} schema={(done.result as { schema?: string })?.schema} isMock={(done.result as { isMock?: boolean })?.isMock} modelsUsed={(done.result as { modelsUsed?: string[] })?.modelsUsed} />
        </div>
      )}
      {done && !done.ok && (
        <Card className="space-y-3 border-red/40">
          <CardTitle className="text-red">{done.blocked ? "Paused — not enough credit" : "First run failed"}</CardTitle>
          <CardHint>{done.error}</CardHint>
          <div className="flex gap-3">
            {done.blocked && <Link href="/settings/billing"><Button phase="green" size="sm">Top up</Button></Link>}
            <Link href="/my-apps"><Button phase="ghost" size="sm">Back to Apps</Button></Link>
          </div>
        </Card>
      )}
      {pending && done === null && finished && <p className="text-xs text-fg-faint px-2">Running…</p>}
    </div>
  );
}
