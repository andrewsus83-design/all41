"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RunFrame } from "@/components/apps/types";
import { SEO_SCRIPT } from "./demo-fixtures";

/** Reduce a new frame into the list exactly like use-app-run (collapse a "step" running→done by id). */
function reduce(frames: RunFrame[], f: RunFrame): RunFrame[] {
  if (f.step === "step") {
    const i = frames.findIndex((x) => x.step === "step" && x.id === (f as { id: string }).id);
    if (i >= 0) { const next = frames.slice(); next[i] = f; return next; }
  }
  return [...frames, f];
}

/**
 * A drop-in twin of use-app-run: replays SEO_SCRIPT on jittered timers into the same frames[] shape,
 * so the REAL <RunProgress> renders it unchanged. No network, no cost.
 */
export function useMockRun() {
  const [frames, setFrames] = useState<RunFrame[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; }, []);

  const start = useCallback(() => {
    clear();
    setFrames([]); setDone(false); setRunning(true);
    let t = 0;
    for (const { delay, frame } of SEO_SCRIPT) {
      t += delay;
      timers.current.push(window.setTimeout(() => setFrames((prev) => reduce(prev, frame)), t));
    }
    timers.current.push(window.setTimeout(() => { setRunning(false); setDone(true); }, t + 300));
  }, [clear]);

  const reset = useCallback(() => { clear(); setFrames([]); setRunning(false); setDone(false); }, [clear]);

  useEffect(() => () => clear(), [clear]);

  return { frames, running, done, start, reset };
}
