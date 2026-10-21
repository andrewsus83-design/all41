"use client";

import { Radio, Search, Undo2, WifiOff } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { QrScanner } from "@/components/qr/qr-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/form";
import { formatAgo, formatClock } from "@/lib/checkin/format";
import type { CheckinResult, CheckinStats, SearchHit } from "@/lib/checkin/records";
import { checkInFromList, scanPass, undoCheckIn, type ActionResult, type ScanOutcome } from "./actions";
import { CheckingChip, ResultCard, type DoorCard } from "./result-card";
import { getQueue, setQueue, useOfflineQueue, type Queued } from "./offline-queue";
import { useLiveStats } from "./use-live-stats";
import { WalkInForm } from "./walk-in-form";

/** The same pass held in front of the camera is answered once. */
const SAME_PASS_MS = 10_000;
/** How long the answer stays on the card before the camera is clear again. */
const CARD_MS = { success: 5000, other: 8000 } as const;
const RETRY_MS = 4000;
const MAX_ATTEMPTS = 30;

interface Attention {
  id: number;
  at: string;
  message: string;
}

const vibrate = (pattern: number | number[]) => {
  try {
    // Browsers ignore, and some log a warning for, a buzz before the person has touched the page.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // Not every phone can.
  }
};

function cardFor(key: number, outcome: ScanOutcome): DoorCard {
  switch (outcome.outcome) {
    case "checked_in":
      return { key, kind: "checked_in", guest: outcome.guest, checkedInAt: outcome.checkedInAt };
    case "already_checked_in":
      return { key, kind: "already", guest: outcome.guest, checkedInAt: outcome.checkedInAt };
    case "other_event":
      return { key, kind: "other_event", eventName: outcome.eventName };
    case "unknown":
      return { key, kind: "unknown" };
    case "not_a_pass":
      return { key, kind: "not_a_pass" };
  }
}

export function CheckinConsole({
  eventId,
  timeZone,
  initialStats,
  canUndo,
  canAddWalkIn,
  guestListFull,
}: {
  eventId: string;
  timeZone: string;
  initialStats: CheckinStats;
  canUndo: boolean;
  canAddWalkIn: boolean;
  guestListFull: boolean;
}) {
  const { stats, setStats, updatedAt, status, refreshSoon } = useLiveStats(eventId, initialStats);
  const [card, setCard] = useState<DoorCard | null>(null);
  const [checking, setChecking] = useState(0);
  const queue = useOfflineQueue(eventId);
  const [attention, setAttention] = useState<Attention[]>([]);
  const [signedOut, setSignedOut] = useState(false);
  const keyRef = useRef(0);
  const lastPass = useRef({ text: "", at: 0 });
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncing = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  // On a phone the numbers and the camera are what matters: start with them in view, not the event header.
  useEffect(() => {
    if (window.innerWidth >= 1024 || window.scrollY > 40) return;
    const frame = requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const saveQueue = useCallback((next: Queued[]) => setQueue(eventId, next), [eventId]);

  // The functions a "Try again" button calls are kept in refs, because they call themselves.
  const submitRef = useRef<(text: string, scannedAt: string) => Promise<void>>(async () => {});
  const checkInHitRef = useRef<(hit: SearchHit) => Promise<boolean>>(async () => false);

  const show = useCallback((next: DoorCard, afterMs?: number) => {
    clearTimeout(dismissTimer.current);
    setCard(next);
    const wait = afterMs ?? (next.kind === "checked_in" ? CARD_MS.success : CARD_MS.other);
    // an error that offers a retry stays until the person decides
    if (next.kind !== "error") dismissTimer.current = setTimeout(() => setCard((now) => (now?.key === next.key ? null : now)), wait);
  }, []);

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  /** Brings the numbers and the recent list up to date at once, then lets the server confirm. */
  const noteCheckedIn = useCallback(
    (result: Extract<CheckinResult, { outcome: "checked_in" }>) => {
      setStats((now) => {
        if (now.recent.some((entry) => entry.guestId === result.guest.id)) return now;
        return {
          ...now,
          checkedIn: now.checkedIn + 1,
          attendingCheckedIn: now.attendingCheckedIn + (result.guest.response === "attending" ? 1 : 0),
          recent: [
            { guestId: result.guest.id, name: result.guest.name, tableNo: result.guest.tableNo, checkedInAt: result.checkedInAt },
            ...now.recent,
          ].slice(0, 8),
        };
      });
      refreshSoon();
    },
    [setStats, refreshSoon],
  );

  /** Shows what happened for one answer from the server. Returns false when the call failed. */
  const handleResult = useCallback(
    (result: ActionResult<ScanOutcome>, retry: () => void): boolean => {
      keyRef.current += 1;
      const key = keyRef.current;
      if (!result.ok) {
        if (result.signedOut) setSignedOut(true);
        vibrate([80, 60, 80]);
        show({ key, kind: "error", message: result.error, retry: result.signedOut ? undefined : retry });
        return false;
      }
      const outcome = result.value;
      if (outcome.outcome === "checked_in") {
        vibrate(70);
        noteCheckedIn(outcome);
      } else {
        vibrate(outcome.outcome === "already_checked_in" ? [60, 50, 60] : [120, 70, 120]);
      }
      show(cardFor(key, outcome));
      return true;
    },
    [show, noteCheckedIn],
  );

  const submitScan = useCallback(
    async (text: string, scannedAt: string) => {
      setChecking((count) => count + 1);
      try {
        const result = await scanPass(eventId, text);
        handleResult(result, () => void submitRef.current(text, scannedAt));
      } catch {
        // The request never got an answer: keep the scan and try again when the connection is back.
        saveQueue([...getQueue(eventId), { text, at: scannedAt, attempts: 1 }]);
        keyRef.current += 1;
        show({ key: keyRef.current, kind: "queued" });
        vibrate([50, 40, 50]);
      } finally {
        setChecking((count) => count - 1);
      }
    },
    [eventId, handleResult, saveQueue, show],
  );

  useEffect(() => {
    submitRef.current = submitScan;
  }, [submitScan]);

  const onScan = useCallback(
    (text: string) => {
      const now = Date.now();
      if (text === lastPass.current.text && now - lastPass.current.at < SAME_PASS_MS) return;
      lastPass.current = { text, at: now };
      void submitScan(text, new Date(now).toISOString());
    },
    [submitScan],
  );

  // Works through the saved scans, one at a time, while the phone can reach the server.
  useEffect(() => {
    if (queue.length === 0) return;
    const timer = setInterval(async () => {
      if (syncing.current || getQueue(eventId).length === 0 || navigator.onLine === false) return;
      syncing.current = true;
      try {
        for (const item of [...getQueue(eventId)]) {
          let result: ActionResult<ScanOutcome>;
          try {
            result = await scanPass(eventId, item.text);
          } catch {
            const attempts = item.attempts + 1;
            if (attempts > MAX_ATTEMPTS) {
              saveQueue(getQueue(eventId).filter((queued) => queued !== item));
              setAttention((now) => [...now, { id: Date.now(), at: item.at, message: "A scan could not be sent. Search for the guest instead." }]);
              continue;
            }
            saveQueue(getQueue(eventId).map((queued) => (queued === item ? { ...queued, attempts } : queued)));
            break;
          }
          saveQueue(getQueue(eventId).filter((queued) => queued !== item));
          if (!result.ok) {
            setAttention((now) => [...now, { id: Date.now(), at: item.at, message: result.error }]);
          } else if (result.value.outcome === "checked_in") {
            noteCheckedIn(result.value);
          } else if (result.value.outcome !== "already_checked_in") {
            const reason =
              result.value.outcome === "other_event"
                ? "A pass for another event"
                : result.value.outcome === "not_a_pass"
                  ? "A code that is not a guest pass"
                  : "A pass that is not on the guest list";
            setAttention((now) => [...now, { id: Date.now(), at: item.at, message: `${reason} was scanned while offline.` }]);
          }
        }
      } finally {
        syncing.current = false;
      }
    }, RETRY_MS);
    return () => clearInterval(timer);
  }, [queue.length, eventId, noteCheckedIn, saveQueue]);

  const undo = useCallback(
    async (guestId: string) => {
      if (!window.confirm("Undo this check-in?")) return;
      const result = await undoCheckIn(eventId, guestId);
      keyRef.current += 1;
      if (!result.ok) {
        show({ key: keyRef.current, kind: "error", message: result.error });
        return;
      }
      setCard(null);
      setStats((now) => {
        const removed = now.recent.some((entry) => entry.guestId === guestId);
        return { ...now, checkedIn: Math.max(0, now.checkedIn - 1), recent: removed ? now.recent.filter((entry) => entry.guestId !== guestId) : now.recent };
      });
      lastPass.current = { text: "", at: 0 };
      refreshSoon();
    },
    [eventId, refreshSoon, setStats, show],
  );

  const checkInHit = useCallback(
    async (hit: SearchHit) => {
      setChecking((count) => count + 1);
      try {
        const result = await checkInFromList(eventId, hit.id);
        return handleResult(result, () => void checkInHitRef.current(hit));
      } catch {
        keyRef.current += 1;
        show({ key: keyRef.current, kind: "error", message: "No connection. Try again in a moment.", retry: () => void checkInHitRef.current(hit) });
        return false;
      } finally {
        setChecking((count) => count - 1);
      }
    },
    [eventId, handleResult, show],
  );

  useEffect(() => {
    checkInHitRef.current = checkInHit;
  }, [checkInHit]);

  const onWalkIn = useCallback(
    (result: CheckinResult) => {
      handleResult({ ok: true, value: result }, () => {});
    },
    [handleResult],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start">
      <div ref={topRef} className="scroll-mt-4 space-y-4">
        <LiveNumbers stats={stats} updatedAt={updatedAt} status={status} />

        {signedOut && (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Your session has ended.{" "}
            <a href={`/login?next=/dashboard/events/${eventId}/checkin`} className="font-bold underline">
              Sign in again
            </a>{" "}
            to keep checking guests in.
          </p>
        )}

        <div className="relative mx-auto w-full max-w-md">
          <QrScanner onScan={onScan} cooldownMs={SAME_PASS_MS} frame={false} />
          {/* The scanner frame from the brand kit, over the camera. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 aspect-square overflow-hidden rounded-2xl">
            <div className="absolute inset-[10%]">
              <span className="absolute top-0 left-0 size-9 rounded-tl-2xl border-t-4 border-l-4 border-gold" />
              <span className="absolute top-0 right-0 size-9 rounded-tr-2xl border-t-4 border-r-4 border-gold" />
              <span className="absolute bottom-0 left-0 size-9 rounded-bl-2xl border-b-4 border-l-4 border-gold" />
              <span className="absolute right-0 bottom-0 size-9 rounded-br-2xl border-r-4 border-b-4 border-gold" />
              {!card && <span className="absolute top-0 left-0 h-1 w-full animate-scan-line bg-gold shadow-[0_0_15px_var(--color-gold)]" />}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-square flex-col justify-between overflow-hidden rounded-2xl">
            <div className="flex justify-center p-3">{checking > 0 && <CheckingChip />}</div>
            {card ? (
              <div className="pointer-events-auto h-[66%]">
                <ResultCard card={card} timeZone={timeZone} canUndo={canUndo} onUndo={undo} onDismiss={() => setCard(null)} />
              </div>
            ) : (
              <p className="m-3 self-center rounded-full bg-black/70 px-4 py-2 text-center text-sm font-bold text-white backdrop-blur">
                Point the camera at the guest&apos;s QR code
              </p>
            )}
          </div>
        </div>

        {queue.length > 0 && (
          <p role="status" className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            {queue.length} {queue.length === 1 ? "scan is" : "scans are"} waiting to be sent. They go through when the connection is back.
          </p>
        )}

        {attention.length > 0 && (
          <Card className="space-y-3 border-warning/30 p-5">
            <h2 className="font-display text-lg font-semibold">Scanned while offline: take a look</h2>
            <ul className="space-y-2 text-sm">
              {attention.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="tabular-nums text-muted">{formatClock(item.at, timeZone)}</span> {item.message}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 font-bold text-gold underline"
                    onClick={() => setAttention((now) => now.filter((other) => other.id !== item.id))}
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <ManualSearch eventId={eventId} timeZone={timeZone} onCheckIn={checkInHit} onUndo={canUndo ? undo : undefined} />
        {canAddWalkIn && <WalkInForm eventId={eventId} onCheckedIn={onWalkIn} full={guestListFull} />}
        <RecentList stats={stats} timeZone={timeZone} onUndo={canUndo ? undo : undefined} />
      </div>
    </div>
  );
}

function LiveNumbers({ stats, updatedAt, status }: { stats: CheckinStats; updatedAt: number; status: "live" | "offline" | "signed_out" }) {
  const [now, setNow] = useState(updatedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const share = stats.attending === 0 ? 0 : Math.min(100, Math.round((stats.attendingCheckedIn / stats.attending) * 100));
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">At the door</h2>
        {status === "live" ? (
          <Badge tone="cyan">
            <Radio className="mr-1.5 size-3 animate-pulse" aria-hidden="true" /> Live
          </Badge>
        ) : status === "offline" ? (
          <Badge tone="warning">Reconnecting · {formatAgo(updatedAt, now)}</Badge>
        ) : (
          <Badge tone="danger">Signed out</Badge>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 px-3 py-3">
          <dd className="font-display text-3xl leading-none font-bold text-gold tabular-nums" aria-live="polite">
            {stats.checkedIn.toLocaleString("en-US")}
          </dd>
          <dt className="mt-1.5 text-xs font-bold tracking-wide text-muted uppercase">Checked in</dt>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3">
          <dd className="font-display text-3xl leading-none font-bold tabular-nums">
            {stats.attendingCheckedIn.toLocaleString("en-US")}
            <span className="text-lg text-muted">/{stats.attending.toLocaleString("en-US")}</span>
          </dd>
          <dt className="mt-1.5 text-xs font-bold tracking-wide text-muted uppercase">Said yes</dt>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-3 py-3">
          <dd className="font-display text-3xl leading-none font-bold tabular-nums">
            {stats.checkedIn.toLocaleString("en-US")}
            <span className="text-lg text-muted">/{stats.totalGuests.toLocaleString("en-US")}</span>
          </dd>
          <dt className="mt-1.5 text-xs font-bold tracking-wide text-muted uppercase">On the list</dt>
        </div>
      </dl>
      <div
        role="meter"
        aria-label="Guests who said yes and have arrived"
        aria-valuemin={0}
        aria-valuemax={stats.attending}
        aria-valuenow={stats.attendingCheckedIn}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${share}%` }} />
      </div>
    </Card>
  );
}

function ManualSearch({
  eventId,
  timeZone,
  onCheckIn,
  onUndo,
}: {
  eventId: string;
  timeZone: string;
  onCheckIn: (hit: SearchHit) => Promise<boolean>;
  onUndo?: (guestId: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/dashboard/events/${eventId}/checkin/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const isJson = response.headers.get("content-type")?.includes("json");
        if (!isJson || response.status === 401) throw new Error("signed out");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { hits: SearchHit[] };
        setHits(body.hits);
        setProblem(undefined);
      } catch (error) {
        if (controller.signal.aborted) return;
        setProblem(error instanceof Error && error.message === "signed out" ? "Your session has ended. Sign in again to search." : "Could not search. Check the connection and try again.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [eventId, trimmed]);

  const shown = trimmed.length < 2 ? null : hits;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <label htmlFor={id} className="font-display text-lg font-semibold">
          Find a guest
        </label>
        <p className="text-sm text-muted">No QR code? Search by name, phone or email.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          id={id}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Dewi, 0812…, dewi@…"
          className={`${controlStyles()} h-14 pl-12`}
        />
      </div>
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      {shown && shown.length === 0 && !problem && <p className="text-sm text-muted">Nobody on the list matches that.</p>}
      {shown && shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {shown.map((hit) => (
            <li key={hit.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{hit.name}</p>
                <p className="truncate text-sm text-muted">
                  {[hit.tableNo ? `Table ${hit.tableNo}` : null, hit.phone, hit.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
                {hit.tags.length > 0 && <p className="truncate text-xs text-gold">{hit.tags.join(", ")}</p>}
              </div>
              {hit.checkedInAt ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="success">In {formatClock(hit.checkedInAt, timeZone)}</Badge>
                  {onUndo && (
                    <button
                      type="button"
                      aria-label={`Undo check-in for ${hit.name}`}
                      onClick={() => onUndo(hit.id)}
                      className="grid size-11 place-items-center rounded-2xl border border-line-strong text-muted hover:border-gold hover:text-fg"
                    >
                      <Undo2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  className="shrink-0"
                  disabled={busy === hit.id}
                  aria-label={`Check in ${hit.name}`}
                  onClick={async () => {
                    setBusy(hit.id);
                    const ok = await onCheckIn(hit);
                    setBusy(undefined);
                    if (ok) {
                      setQuery("");
                      setHits(null);
                    }
                  }}
                >
                  {busy === hit.id ? "…" : "Check in"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentList({ stats, timeZone, onUndo }: { stats: CheckinStats; timeZone: string; onUndo?: (guestId: string) => void }) {
  const entries = useMemo(() => stats.recent, [stats.recent]);
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-display text-lg font-semibold">Recent check-ins</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nobody has checked in yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.guestId} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-bold">{entry.name}</p>
                <p className="text-sm text-muted">{entry.tableNo ? `Table ${entry.tableNo}` : "No table"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-muted tabular-nums">{formatClock(entry.checkedInAt, timeZone)}</span>
                {onUndo && (
                  <button
                    type="button"
                    aria-label={`Undo check-in for ${entry.name}`}
                    onClick={() => onUndo(entry.guestId)}
                    className="grid size-11 place-items-center rounded-2xl border border-line-strong text-muted hover:border-gold hover:text-fg"
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
