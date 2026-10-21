"use client";

import { ArrowLeft, Check, Flag, Lock, ScanLine, Sparkles, Target, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { QrScanner } from "@/components/qr/qr-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/form";
import { extractMissionCode } from "@/lib/games/links";
import type { HuntBoard, HuntClaim, HuntLeaderboard } from "@/lib/games/schemas";
import { Leaderboard } from "./leaderboard";
import { postJson } from "./post-json";
import { rememberGuest } from "./remember-guest";
import { usePoll } from "./use-poll";

type Message = { tone: "success" | "info" | "danger"; text: string };

export function HuntPlayer({
  token,
  playKey,
  eventName,
  initialBoard,
  autoCode,
}: {
  token: string;
  playKey: string;
  eventName: string;
  initialBoard: HuntBoard;
  /** A code that came with the link, for a guest who scanned a mission QR with the phone camera. */
  autoCode?: string;
}) {
  const [board, setBoard] = useState<HuntBoard>(initialBoard);
  const [leaders, setLeaders] = useState(initialBoard.leaderboard);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [secondsToWait, setSecondsToWait] = useState(0);
  const typed = useRef<HTMLInputElement>(null);
  const claiming = useRef(false);

  useEffect(() => rememberGuest(playKey, token), [playKey, token]);

  // The leaderboard is the same for everybody, so it comes from the shared address, not from the database per phone.
  usePoll<HuntLeaderboard>(`/api/games/state/${playKey}/hunt`, { intervalMs: 15_000, onData: (data) => setLeaders(data.leaderboard) });

  const reloadBoard = useCallback(async () => {
    const result = await postJson<HuntBoard>("/api/games/guest/hunt/board", { token });
    if (result.ok) {
      setBoard(result.data);
      setLeaders(result.data.leaderboard);
    }
  }, [token]);

  const submit = useCallback(
    async (code: string) => {
      if (claiming.current) return;
      claiming.current = true;
      setBusy(true);
      try {
        const result = await postJson<HuntClaim>("/api/games/guest/hunt/claim", { token, code });
        if (!result.ok) {
          setMessage({ tone: "danger", text: "Could not reach the game. Check your connection and try again." });
          return;
        }
        const claim = result.data;
        if (claim.status === "claimed") {
          navigator.vibrate?.([40, 30, 40]);
          setScanning(false);
          setMessage({ tone: "success", text: `${claim.mission}: +${claim.points} points! You have ${claim.total.toLocaleString("en-US")}.` });
          await reloadBoard();
        } else if (claim.status === "already_claimed") {
          setScanning(false);
          setMessage({ tone: "info", text: `You already found "${claim.mission}". No extra points, but nice try.` });
        } else if (claim.status === "wrong_code") {
          setMessage({ tone: "danger", text: `That code does not match a mission. ${claim.triesLeft} ${claim.triesLeft === 1 ? "try" : "tries"} left this minute.` });
        } else {
          setSecondsToWait(claim.retryAfter);
          setMessage({ tone: "danger", text: "Too many wrong codes. Take a breath, then try again." });
        }
      } catch {
        setMessage({ tone: "danger", text: "Could not reach the game. Check your connection and try again." });
      } finally {
        claiming.current = false;
        setBusy(false);
      }
    },
    [token, reloadBoard],
  );

  // A mission QR scanned with the phone's own camera lands here with the code in the link.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (!autoCode || autoSubmitted.current) return;
    autoSubmitted.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    void submit(autoCode);
  }, [autoCode, submit]);

  // Counts the wait down, one second at a time.
  const waiting = secondsToWait > 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setSecondsToWait((left) => Math.max(0, left - 1)), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  function onScan(text: string) {
    if (busy || waiting) return;
    const code = extractMissionCode(text);
    if (!code) {
      setMessage({ tone: "danger", text: "That QR code is not a mission code. Look for the all41 hunt posters." });
      return;
    }
    void submit(code);
  }

  const total = board.missions.length;
  const done = board.missions.filter((mission) => mission.done).length;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-5 pb-6">
      <header>
        <p className="text-xs font-bold tracking-widest text-neon-cyan uppercase">Scavenger hunt</p>
        <p className="truncate font-display text-lg font-semibold">{eventName}</p>
      </header>

      {message && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
            message.tone === "success"
              ? "border-gold bg-gold text-black shadow-gold"
              : message.tone === "info"
                ? "border-line-strong bg-surface text-fg"
                : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message.tone === "success" ? <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden /> : message.tone === "danger" ? <X className="mt-0.5 size-5 shrink-0" aria-hidden /> : <Check className="mt-0.5 size-5 shrink-0" aria-hidden />}
          <span className="flex-1">{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="-m-2 grid size-11 shrink-0 place-items-center opacity-70" aria-label="Dismiss">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <Card className="relative overflow-hidden border-neon-cyan/30 p-6 shadow-neon">
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-neon-cyan/10 blur-2xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-widest text-muted uppercase">Your points</p>
            <p className="font-display text-5xl font-bold text-neon-cyan tabular-nums">{board.total.toLocaleString("en-US")}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tracking-widest text-muted uppercase">Rank</p>
            <p className="font-display text-3xl font-bold text-gold">{board.rank ? `#${board.rank}` : "–"}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="flex justify-between text-sm text-muted">
            <span>
              {done} of {total} missions
            </span>
            {total > 0 && done === total && <span className="font-bold text-success">All found!</span>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-neon-cyan" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
          </div>
        </div>
      </Card>

      <section aria-labelledby="missions" className="space-y-3">
        <h1 id="missions" className="font-display text-2xl font-semibold">
          Missions
        </h1>
        {board.missions.length === 0 ? (
          <p className="text-muted">The host has not added missions yet. Check back soon.</p>
        ) : (
          <ul className="space-y-3">
            {board.missions.map((mission) => (
              <li
                key={mission.id}
                className={`flex items-start gap-4 rounded-[1.5rem] border p-4 ${mission.done ? "border-success/30 bg-success/5" : "border-line bg-panel"}`}
              >
                <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full ${mission.done ? "bg-success text-black" : "bg-zinc-800 text-zinc-400"}`}>
                  {mission.done ? <Check className="size-5" aria-label="Found" /> : <Target className="size-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight font-semibold">{mission.title}</p>
                  {mission.hint && <p className="mt-1 text-sm text-muted">Hint: {mission.hint}</p>}
                </div>
                <span className={`shrink-0 font-display text-lg font-bold tabular-nums ${mission.done ? "text-success" : "text-gold"}`}>+{mission.points}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="leaders" className="space-y-3">
        <h2 id="leaders" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Trophy className="size-6 text-gold" aria-hidden /> Leaderboard
        </h2>
        <Leaderboard rows={leaders} meId={board.id} empty="Be the first on the board. Find a mission!" />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-5 pb-6">
        <Button size="lg" variant="neon" className="w-full" onClick={() => setScanning(true)} disabled={total === 0}>
          <ScanLine className="size-6" aria-hidden /> Scan a mission QR
        </Button>
      </div>

      {scanning && (
        <div role="dialog" aria-modal="true" aria-label="Scan a mission" className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center gap-3 p-5">
            <button type="button" onClick={() => setScanning(false)} className="grid size-11 place-items-center rounded-full bg-white/10 text-white scale-on-click" aria-label="Close the scanner">
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <h2 className="font-display text-xl font-semibold text-white">Scan a mission QR</h2>
          </div>
          <div className="mx-auto w-full max-w-md flex-1 space-y-5 overflow-y-auto px-5 pb-8">
            <div className="relative">
              <QrScanner onScan={onScan} paused={busy || waiting} cooldownMs={4000} />
              <div aria-hidden className="pointer-events-none absolute inset-[14%]">
                <span className="absolute top-0 left-0 size-8 rounded-tl-2xl border-t-4 border-l-4 border-gold" />
                <span className="absolute top-0 right-0 size-8 rounded-tr-2xl border-t-4 border-r-4 border-gold" />
                <span className="absolute bottom-0 left-0 size-8 rounded-bl-2xl border-b-4 border-l-4 border-gold" />
                <span className="absolute right-0 bottom-0 size-8 rounded-br-2xl border-r-4 border-b-4 border-gold" />
              </div>
            </div>

            {message && message.tone !== "success" && (
              <p role="status" className={`rounded-2xl px-4 py-3 text-sm font-bold ${message.tone === "danger" ? "bg-danger/10 text-danger" : "bg-white/10 text-white"}`}>
                {message.text}
              </p>
            )}

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const code = extractMissionCode(typed.current?.value ?? "");
                if (!code) {
                  setMessage({ tone: "danger", text: "A mission code has 6 or more letters and digits." });
                  return;
                }
                void submit(code);
              }}
            >
              <label htmlFor="mission-code" className="block text-sm font-bold text-zinc-300">
                Or type the code from the poster
              </label>
              <div className="flex gap-3">
                <input
                  id="mission-code"
                  ref={typed}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={40}
                  placeholder="MASCOT01"
                  disabled={waiting}
                  className={`${controlStyles()} h-14 flex-1 tracking-widest uppercase`}
                />
                <Button type="submit" size="lg" className="shrink-0 px-6" disabled={busy || waiting}>
                  {waiting ? (
                    <>
                      <Lock className="size-5" aria-hidden /> {secondsToWait}s
                    </>
                  ) : busy ? (
                    "Checking…"
                  ) : (
                    <>
                      <Flag className="size-5" aria-hidden /> Go
                    </>
                  )}
                </Button>
              </div>
              {waiting && <p className="text-sm text-warning">Too many wrong tries. You can try again in {secondsToWait} seconds.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
