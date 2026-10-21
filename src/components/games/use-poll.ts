"use client";

import { useEffect, useRef } from "react";

interface PollOptions<T> {
  /** Called with each response. A 404 or a failure does not call it. */
  onData: (data: T) => void;
  intervalMs: number;
  enabled?: boolean;
  /** Called when the server says the address does not exist (a 404). */
  onMissing?: () => void;
  /** Called after every attempt with whether the server answered, for a "reconnecting" hint. */
  onReachable?: (reachable: boolean) => void;
}

/**
 * Fetches a JSON address again and again. It waits a little longer after a failure (up to 8 seconds),
 * stops while the page is hidden, and adds a random 20 percent to every wait so hundreds of phones
 * that opened together do not keep asking in the same instant.
 */
export function usePoll<T>(url: string | null, { onData, intervalMs, enabled = true, onMissing, onReachable }: PollOptions<T>) {
  const onDataRef = useRef(onData);
  const onMissingRef = useRef(onMissing);
  const onReachableRef = useRef(onReachable);

  useEffect(() => {
    onDataRef.current = onData;
    onMissingRef.current = onMissing;
    onReachableRef.current = onReachable;
  }, [onData, onMissing, onReachable]);

  useEffect(() => {
    if (!url || !enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const controller = new AbortController();

    async function tick() {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch(url!, { cache: "no-store", signal: controller.signal });
          if (response.status === 404) {
            onMissingRef.current?.();
            failures = 0;
            onReachableRef.current?.(true);
          } else if (!response.ok) {
            failures += 1;
            onReachableRef.current?.(false);
          } else {
            failures = 0;
            onReachableRef.current?.(true);
            onDataRef.current((await response.json()) as T);
          }
        } catch {
          if (stopped) return;
          failures += 1;
          onReachableRef.current?.(false);
        }
      }
      if (stopped) return;
      const wait = Math.min(8000, intervalMs * 2 ** Math.min(failures, 3));
      timer = setTimeout(() => void tick(), wait * (1 + Math.random() * 0.2));
    }

    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();

    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, enabled, intervalMs]);
}
