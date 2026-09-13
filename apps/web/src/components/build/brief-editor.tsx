"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHint } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { answerToText } from "@/components/apps/format";
import { BRIEF_INTRO } from "./catalog-copy";
import type { Answers, CatalogApp, ConfigQuestion } from "@/components/apps/types";

type Segment = { t: "text"; v: string } | { t: "field"; key: string };

export function parseTemplate(tpl: string): Segment[] {
  const out: Segment[] = [];
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let last = 0;
  for (let m = re.exec(tpl); m; m = re.exec(tpl)) {
    if (m.index > last) out.push({ t: "text", v: tpl.slice(last, m.index) });
    out.push({ t: "field", key: m[1] });
    last = m.index + m[0].length;
  }
  if (last < tpl.length) out.push({ t: "text", v: tpl.slice(last) });
  return out;
}

const blank = "squircle inline-flex items-center align-baseline rounded-1 bg-amber-soft border-b-2 border-amber/60 px-2 mx-0.5 text-fg transition hover:bg-amber/25";

function InlineText({ q, value, onChange }: { q: ConfigQuestion; value: string; onChange: (v: string) => void }) {
  const ph = (q.placeholder ? q.placeholder.replace(/^e\.g\.\s*/i, "").split(/,|\bor\b/)[0].trim() : q.question).slice(0, 40);
  return (
    <span className={cn(blank, "min-w-[8ch] max-w-full")}>
      <span className="inline-grid max-w-full">
        <span className="invisible col-start-1 row-start-1 whitespace-pre px-0.5">{value || ph}</span>
        <input aria-label={q.question} value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-fg-faint px-0.5" />
      </span>
    </span>
  );
}

function InlinePick({ q, value, onChange }: { q: ConfigQuestion; value: string | string[]; onChange: (v: string | string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const multi = q.type === "multi";
  const arr = Array.isArray(value) ? value : [];
  const shown = multi ? arr.join(", ") : (value as string);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block align-baseline">
      <button type="button" aria-label={q.question} aria-expanded={open} onClick={() => setOpen(!open)} className={cn(blank, "gap-1.5", !shown && "text-fg-faint")}>
        {shown || q.question}
        <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <span className="absolute left-0 top-full mt-2 z-30 squircle rounded-3 bg-bg-elev border border-line-strong p-2 min-w-48 shadow-xl block">
          <span className="block text-xs text-fg-faint px-2 py-1 whitespace-nowrap">{q.question}</span>
          {(q.options ?? []).map((o) => {
            const on = multi ? arr.includes(o) : value === o;
            return (
              <button key={o} type="button" onClick={() => { if (multi) onChange(on ? arr.filter((x) => x !== o) : [...arr, o]); else { onChange(o); setOpen(false); } }} className={cn("flex w-full items-center gap-2 text-left px-3 py-2 rounded-2 text-sm font-title transition whitespace-nowrap", on ? "bg-amber-soft text-amber" : "hover:bg-bg-elev-2")}>
                {multi && <span className={cn("size-3.5 rounded-sm border", on ? "bg-black border-black" : "border-line-strong")} />}
                {o}
              </button>
            );
          })}
          {multi && <button type="button" onClick={() => setOpen(false)} className="mt-1 w-full text-xs text-fg-muted hover:text-fg py-1">Done</button>}
        </span>
      )}
    </span>
  );
}

function isAnswered(q: ConfigQuestion, v: unknown) {
  return q.type === "multi" ? Array.isArray(v) && v.length > 0 : typeof v === "string" && v.trim().length > 0;
}

/**
 * The consultant's fill-in-the-blanks brief: the template rendered as one readable sentence with inline blanks.
 * Keys the template doesn't mention are asked below. The pencil switches to "edit the whole brief as text" (optional).
 */
export function BriefEditor({ app, initial, onSubmit, busy }: { app: CatalogApp; initial?: Answers; onSubmit: (answers: Answers) => void; busy?: boolean }) {
  const tpl = app.briefTemplate ?? "";
  const segments = useMemo(() => parseTemplate(tpl), [tpl]);
  const byKey = useMemo(() => Object.fromEntries(app.questions.map((q) => [q.key, q])), [app.questions]);
  const inTemplate = new Set(segments.filter((s): s is { t: "field"; key: string } => s.t === "field").map((s) => s.key));
  const extras = app.questions.filter((q) => !inTemplate.has(q.key));
  const [answers, setAnswers] = useState<Answers>(() => {
    const base: Answers = {};
    for (const q of app.questions) base[q.key] = (initial?.[q.key] as string | string[] | undefined) ?? (q.type === "multi" ? [] : "");
    if (typeof initial?.brief_note === "string") base.brief_note = initial.brief_note;
    return base;
  });
  const [textMode, setTextMode] = useState(false);
  const set = (k: string, v: string | string[]) => setAnswers((a) => ({ ...a, [k]: v }));

  const rendered = segments.map((s) => (s.t === "text" ? s.v : answerToText(answers[s.key]) || `[${byKey[s.key]?.question ?? s.key}]`)).join("");
  const complete = app.questions.every((q) => isAnswered(q, answers[q.key]));
  const n = app.questions.filter((q) => isAnswered(q, answers[q.key])).length;

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-start">
        <span className="size-8 rounded-full bg-amber-soft text-amber flex items-center justify-center text-sm shrink-0 font-title">a</span>
        <div>
          <p className="text-lg">Let&apos;s set up <b>{app.isCustom ? "your app" : app.name}</b>. Fill in the blanks.</p>
          <p className="text-sm text-fg-muted mt-1">{BRIEF_INTRO}</p>
        </div>
      </div>

      <Card className="space-y-6 border-amber/30">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Your brief</p>
          <button type="button" onClick={() => setTextMode(!textMode)} aria-pressed={textMode} title={textMode ? "Back to the blanks" : "Edit the whole brief as text"} className="text-fg-faint hover:text-fg text-sm inline-flex items-center gap-1.5">
            <span aria-hidden>✎</span>{textMode ? "Back to blanks" : "Edit as text"}
          </button>
        </div>

        {textMode ? (
          <div className="space-y-2">
            <Textarea value={typeof answers.brief_note === "string" && answers.brief_note ? answers.brief_note : rendered} onChange={(e) => set("brief_note", e.target.value)} className="text-lg leading-relaxed min-h-32" aria-label="Brief as text" />
            <CardHint>Optional. Your wording is passed along with the blanks — the blanks still need to be filled.</CardHint>
          </div>
        ) : (
          <p className="text-xl leading-[2.2] font-title">
            {segments.map((s, i) => {
              if (s.t === "text") return <span key={i}>{s.v}</span>;
              const q = byKey[s.key];
              if (!q) return <span key={i} className="text-fg-faint">{`{{${s.key}}}`}</span>;
              if (q.type === "text") return <InlineText key={s.key} q={q} value={String(answers[s.key] ?? "")} onChange={(v) => set(s.key, v)} />;
              return <InlinePick key={s.key} q={q} value={answers[s.key] ?? (q.type === "multi" ? [] : "")} onChange={(v) => set(s.key, v)} />;
            })}
          </p>
        )}

        {extras.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-line">
            {extras.map((q) => (
              <div key={q.key} className="space-y-2">
                <p className="text-sm text-fg-muted">{q.question}</p>
                {q.type === "text" ? (
                  <Input value={String(answers[q.key] ?? "")} placeholder={q.placeholder} onChange={(e) => set(q.key, e.target.value)} aria-label={q.question} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(q.options ?? []).map((o) => {
                      const cur = answers[q.key];
                      const on = q.type === "multi" ? Array.isArray(cur) && cur.includes(o) : cur === o;
                      return <button key={o} type="button" onClick={() => set(q.key, q.type === "multi" ? (on ? (cur as string[]).filter((x) => x !== o) : [...((cur as string[]) ?? []), o]) : o)} className={cn("squircle h-10 px-4 rounded-2 border text-sm font-title font-medium transition", on ? "bg-amber-soft text-amber border-transparent" : "border-line-strong bg-bg-elev hover:bg-bg-elev-2")}>{o}</button>;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Button phase="green" size="lg" disabled={!complete || busy} onClick={() => onSubmit(answers)}>Build &amp; try</Button>
          <CardHint><span className="num">{n}</span> of <span className="num">{app.questions.length}</span> blanks filled{complete ? " — this runs it once, for real, so you can see what you'd get." : ""}</CardHint>
        </div>
      </Card>
    </div>
  );
}
