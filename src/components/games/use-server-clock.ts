"use client";

import { useCallback, useEffect, useRef } from "react";

const SAMPLES = 4;
const RESYNC_MS = 60_000;

/**
 * Reads the server's clock so a countdown ends when the database says the question closes,
 * not when the phone's own (often wrong) clock says so. Each sample is taken as the server time
 * plus half the round trip, and the sample with the shortest round trip wins. The database
 * still decides who was in time; this only keeps the screen honest.
 */
export function useServerClock() {
  const offset = useRef(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function sync() {
      let best: { rtt: number; offset: number } | undefined;
      for (let sample = 0; sample < SAMPLES && !stopped; sample++) {
        try {
          const sent = Date.now();
          const response = await fetch("/api/games/time", { cache: "no-store" });
          const received = Date.now();
          const { now } = (await response.json()) as { now: number };
          const rtt = received - sent;
          if (!best || rtt < best.rtt) best = { rtt, offset: now + rtt / 2 - received };
        } catch {
          // a failed sample is skipped; the next resync tries again
        }
      }
      if (best && !stopped) offset.current = best.offset;
      if (!stopped) timer = setTimeout(() => void sync(), RESYNC_MS);
    }

    void sync();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  /** The server's time in milliseconds since 1970, as best known. */
  return useCallback(() => Date.now() + offset.current, []);
}
