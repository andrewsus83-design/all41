"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { submitReport } from "@/app/(app)/report-actions";

const KINDS = [
  { key: "Bug", label: "Something's broken", icon: "🐞" },
  { key: "Idea", label: "I have an idea", icon: "💡" },
  { key: "Other", label: "Something else", icon: "💬" },
] as const;

export function ReportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-3.5 rounded-full text-sm font-title font-medium text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition"
      >
        Report
      </button>
      {open && <ReportFlow onClose={() => setOpen(false)} />}
    </>
  );
}

/** A Typeform-style, full-screen report — one question at a time, on the warm design system. */
function ReportFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0 kind · 1 message · 2 thanks
  const [kind, setKind] = useState<string>("");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const send = () => start(async () => {
    const r = await submitReport(`[${kind || "Report"}] ${text}`);
    if (r.ok) setStep(2); else setErr(r.message);
  });

  return (
    <div className="fixed inset-0 z-[90] bg-bg flex flex-col scene-in">
      {/* top: progress + close */}
      <div className="flex items-center gap-4 p-5">
        <div className="flex-1 max-w-xs h-1 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-coral transition-all duration-300" style={{ width: `${(Math.min(step, 2) / 2) * 100}%` }} />
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="size-9 rounded-full grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev-2 transition">✕</button>
      </div>

      {/* center: the one question */}
      <div className="flex-1 grid place-items-center px-6 pb-16">
        <div key={step} className="w-full max-w-xl space-y-6 scene-in">
          {step === 0 && (
            <>
              <p className="font-title text-2xl md:text-3xl font-medium leading-snug">
                <span className="text-coral num mr-2 text-base align-middle">1 →</span>What&apos;s up?
              </p>
              <div className="grid gap-2.5">
                {KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => { setKind(k.key); setStep(1); }}
                    className={cn("text-left squircle rounded-3 border px-5 py-4 flex items-center gap-3 transition hover:border-coral hover:bg-coral-soft",
                      kind === k.key ? "border-coral bg-coral-soft" : "border-line bg-bg-elev")}
                  >
                    <span className="text-2xl">{k.icon}</span>
                    <span className="font-title font-medium">{k.label}</span>
                  </button>
                ))}
              </div>
              <p className="reflect text-fg-muted text-lg">We read every single one ✿</p>
            </>
          )}

          {step === 1 && (
            <>
              <p className="font-title text-2xl md:text-3xl font-medium leading-snug">
                <span className="text-coral num mr-2 text-base align-middle">2 →</span>Tell us what happened
              </p>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send(); }}
                placeholder="Type your answer here…"
                className="w-full h-40 bg-transparent border-0 border-b-2 border-line focus:border-coral outline-none text-xl leading-relaxed resize-none transition placeholder:text-fg-faint"
              />
              {err && <p className="text-sm text-red">{err}</p>}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button type="button" onClick={() => setStep(0)} className="text-sm text-fg-faint hover:text-fg transition">← Back</button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-fg-faint hidden sm:inline">⌘↵ to send</span>
                  <Button phase="green" size="lg" disabled={pending || !text.trim()} onClick={send}>{pending ? "Sending…" : "Send →"}</Button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center space-y-5">
              <p className="text-5xl">✓</p>
              <p className="font-title text-3xl font-semibold">Thanks — we got it.</p>
              <p className="reflect text-fg-muted text-xl">Every report makes all41 better ✿</p>
              <Button phase="green" size="lg" onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
