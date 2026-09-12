"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { answerToText } from "@/components/apps/format";
import { CONSULTANT_INTRO } from "./catalog-copy";
import type { Answers, CatalogApp, ConfigQuestion } from "@/components/apps/types";

function Bubble({ who, children }: { who: "consultant" | "you"; children: React.ReactNode }) {
  return who === "consultant" ? (
    <div className="flex gap-3 items-start">
      <span className="size-8 rounded-full bg-amber-soft text-amber flex items-center justify-center text-sm shrink-0 font-title">a</span>
      <div className="max-w-xl text-fg">{children}</div>
    </div>
  ) : (
    <div className="flex justify-end">
      <button type="button" className="squircle rounded-3 bg-bg-elev-2 border border-line px-5 py-3 max-w-lg text-left hover:border-line-strong transition" title="Change this answer">{children}</button>
    </div>
  );
}

function AskCard({ q, n, total, initial, onCommit }: { q: ConfigQuestion; n: number; total: number; initial?: string | string[]; onCommit: (v: string | string[]) => void }) {
  const [draft, setDraft] = useState(typeof initial === "string" ? initial : "");
  const [multi, setMulti] = useState<string[]>(Array.isArray(initial) ? initial : []);
  return (
    <Card className="space-y-5 border-amber/30">
      <CardTitle className="text-2xl">{q.question}</CardTitle>
      {q.type === "text" && (
        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onCommit(draft.trim()); }} className="flex gap-3">
          <Input autoFocus placeholder={q.placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" phase="amber" disabled={!draft.trim()}>Next</Button>
        </form>
      )}
      {q.type === "choice" && (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <button key={o} type="button" onClick={() => onCommit(o)} className={cn("squircle h-12 px-6 rounded-2 border font-title font-medium transition", initial === o ? "bg-amber text-black border-transparent" : "border-line-strong bg-bg-elev hover:bg-amber hover:text-black hover:border-transparent")}>{o}</button>
          ))}
        </div>
      )}
      {q.type === "multi" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(q.options ?? []).map((o) => {
              const on = multi.includes(o);
              return <button key={o} type="button" onClick={() => setMulti(on ? multi.filter((x) => x !== o) : [...multi, o])} className={cn("squircle h-12 px-6 rounded-2 border font-title font-medium transition", on ? "bg-amber text-black border-transparent" : "border-line-strong bg-bg-elev hover:bg-bg-elev-2")}>{o}</button>;
            })}
          </div>
          <Button phase="amber" disabled={multi.length === 0} onClick={() => onCommit(multi)}>Next</Button>
        </div>
      )}
      <CardHint><span className="num">{n}</span> of <span className="num">{total}</span></CardHint>
    </Card>
  );
}

/**
 * The consultant: greets, asks the template's questions one at a time (tap chips / short inputs),
 * then hands the answers back. Pass `initial` to re-open with answers prefilled ("Change answers").
 */
export function Consultant({ app, initial, onComplete, busy }: { app: CatalogApp; initial?: Answers; onComplete: (answers: Answers) => void; busy?: boolean }) {
  const qs = app.questions;
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [idx, setIdx] = useState(0);
  const q = qs[idx];
  const finished = idx >= qs.length;

  function commit(value: string | string[]) {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    // when revisiting an answer, jump back to the first unanswered question (or the end)
    const firstMissing = qs.findIndex((qq, i) => i > idx && next[qq.key] === undefined);
    const nextIdx = firstMissing >= 0 ? firstMissing : qs.every((qq) => next[qq.key] !== undefined) ? qs.length : idx + 1;
    setIdx(nextIdx);
    if (nextIdx >= qs.length) onComplete(next);
  }

  return (
    <div className="space-y-5">
      <Bubble who="consultant">
        <p className="text-lg">Let&apos;s set up <b>{app.name}</b>. {qs.length === 1 ? "One quick question." : `${["", "One", "Two", "Three", "Four", "Five", "Six"][qs.length] ?? qs.length} quick questions.`}</p>
        <p className="text-sm text-fg-muted mt-1">{CONSULTANT_INTRO}</p>
      </Bubble>
      {qs.map((qq, i) => {
        if (i > idx && answers[qq.key] === undefined) return null;
        if (i === idx) return null;
        if (answers[qq.key] === undefined) return null;
        return (
          <div key={qq.key} className="space-y-2">
            <Bubble who="consultant"><p className="text-fg-muted">{qq.question}</p></Bubble>
            <div onClick={() => !busy && setIdx(i)}><Bubble who="you">{answerToText(answers[qq.key])}</Bubble></div>
          </div>
        );
      })}
      {!finished && q && <AskCard key={q.key + idx} q={q} n={idx + 1} total={qs.length} initial={answers[q.key]} onCommit={commit} />}
    </div>
  );
}
