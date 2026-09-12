"use client";
import { useCallback, useRef, useState } from "react";
import type { RunFrame } from "./types";

export type RunState = {
  running: boolean;
  frames: RunFrame[];
  result: { taskId: string; result: unknown; billedUsd: number } | null;
  blocked: { message: string; balance: number; needed: number } | null;
  error: string | null;
  estimate: { billedUsd: number; balance: number } | null;
};

const idle: RunState = { running: false, frames: [], result: null, blocked: null, error: null, estimate: null };

/** Streams POST /api/apps/run and keeps the plain-words progress in state. One run at a time. */
export function useAppRun() {
  const [state, setState] = useState<RunState>(idle);
  const busy = useRef(false);

  const reset = useCallback(() => setState(idle), []);

  const run = useCallback(async (instanceId: string, opts: { preview?: boolean } = {}) => {
    if (busy.current) return;
    busy.current = true;
    setState({ ...idle, running: true });
    try {
      const res = await fetch("/api/apps/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instanceId, preview: opts.preview ?? false }) });
      if (!res.ok || !res.body) {
        setState((s) => ({ ...s, running: false, error: res.status === 401 ? "Please sign in again." : "Something went wrong starting the run." }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const c of chunks) {
          const line = c.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let f: RunFrame & { dup?: boolean };
          try { f = JSON.parse(line.slice(6)); } catch { continue; }
          setState((s) => {
            if (f.step === "estimate") return { ...s, estimate: { billedUsd: f.billedUsd, balance: f.balance } };
            if (f.step === "result") return { ...s, result: { taskId: f.taskId, result: f.result, billedUsd: f.billedUsd } };
            if (f.step === "blocked") return f.dup && s.blocked ? s : { ...s, blocked: { message: f.message, balance: f.balance, needed: f.needed }, frames: [...s.frames, f] };
            if (f.step === "error") return f.dup && s.error ? s : { ...s, error: f.message, frames: [...s.frames, f] };
            if (f.step === "step") {
              // collapse running→done for the same step into one line
              const i = s.frames.findIndex((x) => x.step === "step" && x.id === f.id);
              if (i >= 0) { const next = s.frames.slice(); next[i] = f; return { ...s, frames: next }; }
            }
            return { ...s, frames: [...s.frames, f] };
          });
        }
      }
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      busy.current = false;
      setState((s) => ({ ...s, running: false }));
    }
  }, []);

  return { ...state, run, reset };
}
