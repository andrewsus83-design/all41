"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ResultView } from "@/components/result-view";
import { DEMO_RESULTS } from "@/content/demo-results";
import type { GalleryApp } from "@/content/gallery";

const SKIP = new Set(["schedule", "output_target"]); // delivery settings — keep the demo snappy

/** Is there a canned demo for this app? (Used by the modal to choose this vs the generic demo.) */
export function hasDemo(slug: string) {
  return !!DEMO_RESULTS[slug];
}

const LOADING = ["Picking today's best AI…", "The crew is working…", "Double-checking every claim…"];

export function AppDemo({ app }: { app: GalleryApp }) {
  const demo = DEMO_RESULTS[app.slug];
  const questions = useMemo(() => (app.questions ?? []).filter((q) => !SKIP.has(q.key)), [app.questions]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [phase, setPhase] = useState<"ask" | "loading" | "result">("ask");
  const [loadingMsg, setLoadingMsg] = useState(0);

  if (!demo || questions.length === 0) return null;

  const total = questions.length;
  const q = questions[Math.min(idx, total - 1)];

  const finish = () => {
    setPhase("loading");
    setLoadingMsg(0);
    const t1 = setTimeout(() => setLoadingMsg(1), 600);
    const t2 = setTimeout(() => setLoadingMsg(2), 1200);
    const t3 = setTimeout(() => { setPhase("result"); clearTimeout(t1); clearTimeout(t2); }, 1800);
    void t3;
  };
  const advance = () => (idx + 1 >= total ? finish() : setIdx(idx + 1));
  const setText = (v: string) => setAnswers((a) => ({ ...a, [q.key]: v }));
  const toggleMulti = (opt: string) => setAnswers((a) => {
    const cur = Array.isArray(a[q.key]) ? (a[q.key] as string[]) : [];
    return { ...a, [q.key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
  });
  const reset = () => { setIdx(0); setAnswers({}); setPhase("ask"); };

  // ---------- RESULT ----------
  if (phase === "result") {
    return (
      <div className="squircle rounded-5 border border-line bg-bg-elev p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-title text-sm text-fg-muted">Your result · <span className="text-fg-faint">demo data · nothing charged</span></p>
          <Button size="sm" phase="ghost" onClick={reset}>↺ Try again</Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1">
          <ResultView output={demo.result} schema={demo.schema} isMock />
        </div>
      </div>
    );
  }

  // ---------- LOADING ----------
  if (phase === "loading") {
    return (
      <div className="squircle rounded-5 border border-line bg-bg-elev p-8 min-h-[16rem] flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-coral pulse-soft" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
        <p className="text-fg-muted pulse-soft">{LOADING[loadingMsg]}</p>
      </div>
    );
  }

  // ---------- ASK (Typeform-style, one question at a time) ----------
  const val = answers[q.key];
  const multi = Array.isArray(val) ? val : [];
  return (
    <div className="squircle rounded-5 border border-line bg-bg-elev p-6 md:p-8 space-y-6 min-h-[16rem] flex flex-col">
      {/* progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-coral transition-all" style={{ width: `${(idx / total) * 100}%` }} />
        </div>
        <span className="num text-xs text-fg-faint">{idx + 1}/{total}</span>
      </div>

      {/* question */}
      <div className="flex-1 space-y-4">
        <p className="font-title text-xl md:text-2xl font-medium leading-snug">
          <span className="text-coral num mr-2 text-base align-middle">{idx + 1} →</span>{q.question}
        </p>

        {q.type === "text" && (
          <input
            autoFocus
            value={typeof val === "string" ? val : ""}
            placeholder={q.placeholder || "Type your answer…"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") advance(); }}
            className="w-full bg-bg border border-line rounded-2 px-4 h-12 text-fg placeholder:text-fg-faint outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 transition"
          />
        )}

        {q.type === "choice" && (
          <div className="grid gap-2">
            {(q.options ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { setAnswers((a) => ({ ...a, [q.key]: opt })); setTimeout(advance, 120); }}
                className={cn("text-left squircle rounded-2 border px-4 py-3 transition hover:border-coral hover:bg-coral-soft",
                  val === opt ? "border-coral bg-coral-soft" : "border-line")}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "multi" && (
          <div className="flex flex-wrap gap-2">
            {(q.options ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleMulti(opt)}
                className={cn("squircle rounded-2 border px-3.5 py-2 text-sm transition",
                  multi.includes(opt) ? "border-coral bg-coral-soft text-coral" : "border-line text-fg-muted hover:border-coral")}
              >
                {multi.includes(opt) ? "✓ " : ""}{opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="text-sm text-fg-faint hover:text-fg disabled:opacity-30 transition">← Back</button>
        {q.type !== "choice" && (
          <Button size="sm" phase="green" onClick={advance}>{idx + 1 >= total ? "See the result →" : "Next →"}</Button>
        )}
      </div>
    </div>
  );
}
