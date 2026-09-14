"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitReport } from "@/app/(app)/report-actions";

export function ReportButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); setMsg(null); };
  const send = () => start(async () => {
    const r = await submitReport(text);
    setMsg(r.message);
    if (r.ok) { setText(""); setTimeout(() => setOpen(false), 1200); }
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-3.5 rounded-full text-sm font-title font-medium text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition"
      >
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report a problem">
          <div className="fixed inset-0 bg-fg/40 backdrop-blur-sm" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md squircle rounded-5 border border-line bg-bg-elev p-6 space-y-4 shadow-lift">
            <div className="space-y-1">
              <h2 className="font-title text-xl font-medium">Report a problem</h2>
              <p className="text-sm text-fg-muted">Something broken or confusing? Tell us — it goes straight to the team.</p>
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened?"
              className="w-full h-32 bg-bg-elev-2 border border-line rounded-2 p-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 transition"
            />
            <div className="flex items-center justify-between gap-3">
              {msg ? <span className="text-sm text-green">{msg}</span> : <span />}
              <div className="flex gap-2">
                <Button size="sm" phase="ghost" onClick={close}>Cancel</Button>
                <Button size="sm" phase="green" disabled={pending || !text.trim()} onClick={send}>Send</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
