"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckinStats } from "@/lib/checkin/records";

/** Every phone asks about every 5 to 6.5 seconds (this plus up to 1.5 s of random spread). Five phones make about one request a second: nothing for the database. */
const BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 30_000;
/** A phone that just checked someone in refreshes sooner, but never more often than this. */
const MIN_GAP_MS = 1500;

export type LiveStatus = "live" | "offline" | "signed_out";

/**
 * Keeps the door's numbers fresh. Polls a cheap route handler every few seconds
 * with a little random spread, so a room full of phones does not ask at the same
 * instant; waits while the screen is hidden; backs off while the connection is
 * bad; and stops when the session has ended.
 */
export function useLiveStats(eventId: string, initial: CheckinStats) {
  const [stats, setStats] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<LiveStatus>("live");
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let inFlight = false;
    let failures = 0;
    let lastStart = 0;

    const schedule = () => {
      if (stopped) return;
      clearTimeout(timer);
      const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.min(failures, 3)) + Math.random() * 1500;
      timer = setTimeout(() => void load(), delay);
    };

    async function load() {
      if (stopped) return;
      if (inFlight || document.hidden) return schedule();
      inFlight = true;
      lastStart = Date.now();
      controller = new AbortController();
      try {
        const response = await fetch(`/dashboard/events/${eventId}/checkin/live`, {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        // The proxy sends a signed-out visitor to the login page, which is HTML.
        const isJson = response.headers.get("content-type")?.includes("json");
        if (response.status === 401 || response.redirected || !isJson) {
          if (!stopped) setStatus("signed_out");
          stopped = true;
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { stats: CheckinStats };
        if (stopped) return;
        failures = 0;
        setStats(body.stats);
        setUpdatedAt(Date.now());
        setStatus("live");
      } catch {
        if (stopped) return;
        failures += 1;
        setStatus("offline");
      } finally {
        inFlight = false;
        schedule();
      }
    }

    refreshRef.current = () => {
      if (stopped || inFlight || Date.now() - lastStart < MIN_GAP_MS) return;
      void load();
    };

    const onVisible = () => {
      if (!document.hidden) refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    schedule();

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [eventId]);

  /** Asks for fresh numbers soon, for example right after a check-in. */
  const refreshSoon = useCallback(() => {
    setTimeout(() => refreshRef.current(), MIN_GAP_MS);
  }, []);

  return { stats, setStats, updatedAt, status, refreshSoon };
}
