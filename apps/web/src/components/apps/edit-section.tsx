"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { updateInstanceConfig } from "@/app/(app)/my-apps/actions";
import type { Answers, InstanceDetail } from "./types";

/** The app's questions as a form, prefilled. Saving updates the answers, schedule and where it goes. */
export function EditSection({ detail }: { detail: InstanceDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const questions = detail.questions.filter((q) => !(detail.hasFreshToggle && q.key === "needs_fresh"));
  const initial: Answers = Object.fromEntries(questions.map((q) => [q.key, (detail.config[q.key] as string | string[] | undefined) ?? (q.type === "multi" ? [] : "")]));
  const [answers, setAnswers] = useState<Answers>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = JSON.stringify(answers) !== JSON.stringify(initial);

  function save() {
    start(async () => {
      setMsg(null);
      const r = await updateInstanceConfig(detail.id, answers);
      setMsg(r.ok ? "Saved. The next run uses these answers." : r.error);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <CardTitle className="text-xl">Edit</CardTitle>
        <CardHint>Change any answer — the next run picks it up.</CardHint>
      </div>
      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.key} className="space-y-2">
            <p className="text-sm text-fg-muted">{q.question}</p>
            {q.type === "text" && <Input value={String(answers[q.key] ?? "")} placeholder={q.placeholder} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />}
            {q.type === "choice" && (
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((o) => (
                  <button key={o} type="button" onClick={() => setAnswers({ ...answers, [q.key]: o })} className={cn("squircle h-10 px-4 rounded-2 border text-sm font-title font-medium transition", String(answers[q.key]).toLowerCase() === o.toLowerCase() ? "bg-amber-soft text-amber border-transparent" : "border-line-strong bg-bg-elev hover:bg-bg-elev-2")}>{o}</button>
                ))}
              </div>
            )}
            {q.type === "multi" && (
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((o) => {
                  const cur = Array.isArray(answers[q.key]) ? (answers[q.key] as string[]) : [];
                  const on = cur.includes(o);
                  return <button key={o} type="button" onClick={() => setAnswers({ ...answers, [q.key]: on ? cur.filter((x) => x !== o) : [...cur, o] })} className={cn("squircle h-10 px-4 rounded-2 border text-sm font-title font-medium transition", on ? "bg-amber-soft text-amber border-transparent" : "border-line-strong bg-bg-elev hover:bg-bg-elev-2")}>{o}</button>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button phase="amber" size="sm" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save changes"}</Button>
        {dirty && !pending && <Button phase="ghost" size="sm" onClick={() => setAnswers(initial)}>Undo</Button>}
        {msg && <span className="text-xs text-fg-muted">{msg}</span>}
      </div>
    </Card>
  );
}
