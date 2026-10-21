"use client";

import { useEffect, useState } from "react";

/** Seconds left until `closesAt` (server time, ms), refreshed ten times a second. Null when there is no deadline. */
export function useCountdown(closesAt: number | null, now: () => number): { secondsLeft: number; fraction: (limitSeconds: number) => number } | null {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (closesAt === null) return;
    const timer = setInterval(() => setTick((tick) => tick + 1), 100);
    return () => clearInterval(timer);
  }, [closesAt]);

  if (closesAt === null) return null;
  const leftMs = Math.max(0, closesAt - now());
  return { secondsLeft: Math.ceil(leftMs / 1000), fraction: (limitSeconds) => Math.min(1, leftMs / (limitSeconds * 1000)) };
}
