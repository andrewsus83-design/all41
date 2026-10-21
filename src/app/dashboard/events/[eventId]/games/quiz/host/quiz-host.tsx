"use client";

import { Check, Crown, Expand, Maximize2, Play, Radio, SkipForward, Square, Trophy, Users, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ANSWER_STYLES } from "@/components/games/answer-style";
import { Leaderboard } from "@/components/games/leaderboard";
import { newerQuizState } from "@/components/games/newer-state";
import { useCountdown } from "@/components/games/use-countdown";
import { usePoll } from "@/components/games/use-poll";
import { useServerClock } from "@/components/games/use-server-clock";
import { Button, buttonStyles } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import type { QuizSession, QuizState } from "@/lib/games/schemas";
import { controlQuiz, openLobbyHere } from "../../actions";

interface QuizOption {
  id: string;
  title: string;
  questionCount: number;
}

type Action = "start" | "reveal" | "next" | "end";

const AUTO_REVEAL_KEY = "a41-host-auto-reveal";

// The host's choice lives in the browser, with a copy in memory for when storage is blocked.
let autoRevealChoice: boolean | null = null;
const autoRevealListeners = new Set<() => void>();

function readAutoReveal(): boolean {
  if (autoRevealChoice !== null) return autoRevealChoice;
  try {
    return window.localStorage.getItem(AUTO_REVEAL_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeAutoReveal(listener: () => void) {
  autoRevealListeners.add(listener);
  return () => void autoRevealListeners.delete(listener);
}

function storeAutoReveal(next: boolean) {
  autoRevealChoice = next;
  try {
    window.localStorage.setItem(AUTO_REVEAL_KEY, next ? "on" : "off");
  } catch {
    // the choice then lasts until the page is closed
  }
  for (const listener of autoRevealListeners) listener();
}

/**
 * The big screen. Everything on it comes from the database state, which the page polls once a second
 * (one host, so no cache is needed). The host's buttons apply the state they get back at once, so the
 * screen never waits for the next poll. Space or Enter does the main thing.
 */
export function QuizHost({
  eventId,
  eventName,
  published,
  initialState,
  quizzes,
  joinUrl,
  joinQr,
}: {
  eventId: string;
  eventName: string;
  published: boolean;
  initialState: QuizState;
  quizzes: QuizOption[];
  joinUrl: string;
  joinQr: ReactNode;
}) {
  const [state, setState] = useState<QuizState>(initialState);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reachable, setReachable] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [picking, setPicking] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [awake, setAwake] = useState(true);
  const autoReveal = useSyncExternalStore(subscribeAutoReveal, readAutoReveal, () => true);
  const now = useServerClock();
  const autoFired = useRef("");

  const session = state.session;
  const question = session?.question ?? null;
  const countdown = useCountdown(session?.phase === "question" && question ? question.closesAt : null, now);
  const base = `/dashboard/events/${eventId}/games`;

  usePoll<QuizState>(`${base}/quiz/host/state?n=${nonce}`, {
    intervalMs: 1000,
    onData: (next) => setState((previous) => newerQuizState(previous, next)),
    onReachable: setReachable,
    onMissing: () => setSignedOut(true),
  });

  const run = useCallback(
    async (action: Action) => {
      if (!session || busy) return;
      setBusy(action);
      setError(null);
      setConfirmEnd(false);
      try {
        const result = await controlQuiz(eventId, session.id, action, action === "reveal" || action === "next" ? session.position : null);
        if (result.state) {
          setState((previous) => newerQuizState(previous, result.state));
          setPicking(false);
        } else {
          setError(result.error);
          setNonce((value) => value + 1);
        }
      } catch {
        setError("The server did not answer. Check the connection and try again.");
      } finally {
        setBusy(null);
      }
    },
    [busy, eventId, session],
  );

  async function openLobby(quizId: string) {
    if (busy) return;
    setBusy("open");
    setError(null);
    try {
      const result = await openLobbyHere(eventId, quizId);
      if (result.state) {
        setState((previous) => newerQuizState(previous, result.state));
        setPicking(false);
      } else {
        setError(result.error);
        setNonce((value) => value + 1);
      }
    } catch {
      setError("The server did not answer. Check the connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const primary = session ? primaryAction(session) : null;
  const runRef = useRef(run);
  const primaryRef = useRef(primary);
  useEffect(() => {
    runRef.current = run;
    primaryRef.current = primary;
  });

  // Space or Enter does the main thing; F toggles full screen. Buttons and links keep their own keys.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [contenteditable]")) return;
      if (event.key === " " || event.key === "Enter") {
        const action = primaryRef.current?.action;
        if (action) {
          event.preventDefault();
          void runRef.current(action);
        }
      } else if (event.key === "f" || event.key === "F") {
        void toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The control bar hides after a few quiet seconds so the projector shows only the game.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setAwake(false), 5000);
    };
    const wake = () => {
      setAwake(true);
      arm();
    };
    arm();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // Reveal by itself when the time is up or everybody has answered.
  const everybodyAnswered = Boolean(session && session.phase === "question" && session.players > 0 && session.answered !== null && session.answered >= session.players);
  const questionKey = session ? `${session.id}:${session.position}` : "";
  const closesAt = session?.phase === "question" ? (question?.closesAt ?? null) : null;
  useEffect(() => {
    if (!autoReveal || closesAt === null || autoFired.current === questionKey) return;
    // a short grace after the deadline, so an answer sent in the last instant is counted first
    const delay = everybodyAnswered ? 800 : Math.max(0, closesAt - now()) + 500;
    const timer = setTimeout(() => {
      autoFired.current = questionKey;
      void runRef.current("reveal");
    }, delay);
    return () => clearTimeout(timer);
  }, [autoReveal, closesAt, everybodyAnswered, questionKey, now]);

  const showPicker = !session || (session.phase === "finished" && picking);
  const leaderboard = session?.leaderboard ?? [];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink text-fg ${awake ? "" : "cursor-none"}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_85%_-10%,rgb(0_240_255/0.10),transparent),radial-gradient(50rem_36rem_at_-10%_110%,rgb(197_160_89/0.12),transparent)]" />

      <header className="relative flex items-center justify-between gap-6 px-[2.5vw] py-[2vh]">
        <div className="flex min-w-0 items-center gap-4">
          <LogoMark className="size-11 text-lg" />
          <span className="truncate font-display text-[clamp(1rem,1.5vw,1.75rem)] font-semibold text-zinc-300">{eventName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {!reachable && (
            <span role="status" className="flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-bold text-warning">
              <WifiOff className="size-4" aria-hidden /> Reconnecting…
            </span>
          )}
          {session && session.phase !== "finished" && (
            <>
              <span className="flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 font-bold text-neon-cyan">
                <Radio className="size-4 animate-pulse" aria-hidden /> Live
              </span>
              <span className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 font-bold tabular-nums">
                <Users className="size-4 text-muted" aria-hidden /> {session.players.toLocaleString("en-US")}
                <span className="sr-only"> players</span>
              </span>
            </>
          )}
        </div>
      </header>

      {signedOut && (
        <p role="alert" className="relative mx-[2.5vw] rounded-2xl border border-danger/40 bg-danger/10 px-5 py-3 text-danger">
          This screen can no longer reach the quiz. You may have been signed out. <a href="" className="font-bold underline">Reload the page</a>.
        </p>
      )}

      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-[2.5vw] pb-[10vh]">
        {/* the key makes each new screen fade in */}
        <div key={showPicker ? "picker" : `${session!.phase}:${session!.position}`} className="flex flex-1 flex-col motion-safe:animate-stage-in">
          {showPicker ? (
            <Picker
              quizzes={quizzes}
              published={published}
              busy={busy === "open"}
              onOpen={openLobby}
              backToResults={session ? () => setPicking(false) : undefined}
              base={base}
            />
          ) : session!.phase === "lobby" ? (
            <Lobby session={session!} eventName={eventName} published={published} joinUrl={joinUrl} joinQr={joinQr} />
          ) : session!.phase === "question" && question ? (
            <QuestionStage session={session!} left={countdown?.secondsLeft ?? question.timeLimit} fraction={countdown?.fraction(question.timeLimit) ?? 1} />
          ) : session!.phase === "reveal" && question ? (
            <RevealStage session={session!} />
          ) : (
            <FinishedStage session={session!} />
          )}
        </div>
      </main>

      <ControlBar
        visible={awake || Boolean(error) || confirmEnd}
        base={base}
        session={session}
        primary={showPicker ? null : primary}
        busy={busy}
        error={error}
        autoReveal={autoReveal}
        onAutoReveal={storeAutoReveal}
        confirmEnd={confirmEnd}
        onConfirmEnd={setConfirmEnd}
        onRun={run}
        onPickAnother={() => setPicking(true)}
        picking={showPicker}
        hasLeaderboard={leaderboard.length > 0}
      />
    </div>
  );
}

function primaryAction(session: QuizSession): { action: Action; label: string } | null {
  switch (session.phase) {
    case "lobby":
      return { action: "start", label: "Start the quiz" };
    case "question":
      return { action: "reveal", label: "Reveal the answer" };
    case "reveal":
      return session.position !== null && session.position >= session.questionCount
        ? { action: "next", label: "Show the final results" }
        : { action: "next", label: "Next question" };
    default:
      return null;
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // the browser may refuse; nothing to do
  }
}

// ---------------------------------------------------------------- stages

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-display text-[clamp(0.9rem,1.3vw,1.5rem)] font-bold tracking-[0.3em] text-neon-cyan uppercase">{children}</p>;
}

function Picker({
  quizzes,
  published,
  busy,
  onOpen,
  backToResults,
  base,
}: {
  quizzes: QuizOption[];
  published: boolean;
  busy: boolean;
  onOpen: (quizId: string) => void;
  backToResults?: () => void;
  base: string;
}) {
  return (
    <div className="m-auto w-full max-w-4xl space-y-8 text-center">
      <div className="space-y-3">
        <Eyebrow>Live quiz</Eyebrow>
        <h1 className="font-display text-[clamp(2rem,4vw,4.5rem)] font-semibold">Which quiz do you want to run?</h1>
        {!published && <p className="text-warning">This event is not published yet, so guests cannot join. Publish it first.</p>}
      </div>
      {quizzes.length === 0 ? (
        <p className="text-xl text-muted">
          There is no quiz with questions yet.{" "}
          <Link href={base} className="font-bold text-gold underline">
            Set one up
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-4 text-left sm:grid-cols-2">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="flex items-center justify-between gap-4 rounded-[2rem] border border-line bg-panel p-6">
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold">{quiz.title}</p>
                <p className="text-muted">
                  {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
                </p>
              </div>
              <Button variant="neon" disabled={busy} onClick={() => onOpen(quiz.id)}>
                <Play className="size-4" aria-hidden /> Open lobby
              </Button>
            </li>
          ))}
        </ul>
      )}
      {backToResults && (
        <Button variant="ghost" onClick={backToResults}>
          Back to the results
        </Button>
      )}
    </div>
  );
}

function Lobby({ session, eventName, published, joinUrl, joinQr }: { session: QuizSession; eventName: string; published: boolean; joinUrl: string; joinQr: ReactNode }) {
  return (
    <div className="m-auto grid w-full max-w-[110rem] items-center gap-[4vw] lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-[4vh]">
        <div className="space-y-4">
          <Eyebrow>Live quiz · {eventName}</Eyebrow>
          <h1 className="font-display text-[clamp(2.5rem,5.6vw,7rem)] leading-[1.02] font-semibold text-balance">{session.quizTitle}</h1>
          <p className="max-w-3xl text-[clamp(1.1rem,1.7vw,2rem)] text-muted">
            Scan the code with your phone, or open your invitation link and tap <b className="text-fg">Play</b>.
          </p>
        </div>
        {!published && (
          <p className="max-w-3xl rounded-2xl border border-warning/40 bg-warning/10 px-5 py-3 text-warning">This event is not published yet, so guests cannot join. Publish it first.</p>
        )}
        <div className="flex items-end gap-6">
          <span className="font-display text-[clamp(5rem,13vw,15rem)] leading-[0.85] font-bold text-neon-cyan tabular-nums drop-shadow-[0_0_30px_rgb(0_240_255/0.35)]" aria-live="polite">
            {session.players.toLocaleString("en-US")}
          </span>
          <span className="pb-[1vw] text-[clamp(1.25rem,2.2vw,2.75rem)] text-muted">{session.players === 1 ? "player is in" : "players are in"}</span>
        </div>
      </div>
      <figure className="mx-auto flex flex-col items-center gap-4">
        <div className="w-[min(30vw,46vh)] min-w-56 overflow-hidden rounded-[2rem] bg-white p-[1.2vw] shadow-neon [&_svg]:block [&_svg]:h-auto [&_svg]:w-full">{joinQr}</div>
        <figcaption className="max-w-[min(30vw,46vh)] min-w-56 text-center text-sm break-all text-subtle">{joinUrl}</figcaption>
      </figure>
    </div>
  );
}

function TimerRing({ left, fraction }: { left: number; fraction: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const urgent = left <= 5;
  return (
    <div className="relative size-[clamp(6rem,13vh,9.5rem)] shrink-0" role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-zinc-800" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={urgent ? "stroke-danger" : "stroke-neon-cyan"}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
      </svg>
      <span className={`absolute inset-0 grid place-items-center font-display text-[clamp(2.25rem,6vh,4.5rem)] font-bold tabular-nums ${urgent ? "text-danger" : "text-fg"}`}>{left}</span>
    </div>
  );
}

function QuestionStage({ session, left, fraction }: { session: QuizSession; left: number; fraction: number }) {
  const question = session.question!;
  const answered = session.answered ?? 0;
  const share = session.players > 0 ? Math.min(100, (answered / session.players) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-[3vh]">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-1">
          <Eyebrow>
            Question {session.position} of {session.questionCount}
          </Eyebrow>
          <p className="text-[clamp(1rem,1.4vw,1.6rem)] text-muted">{question.basePoints.toLocaleString("en-US")} points for a fast, correct answer</p>
        </div>
        <TimerRing left={left} fraction={fraction} />
      </div>

      <h1 className="m-auto max-w-[100rem] py-[1vh] text-center font-display text-[clamp(2rem,4.2vw,5.25rem)] leading-[1.1] font-semibold text-balance">{question.prompt}</h1>

      <ul className="grid gap-[1.5vw] sm:grid-cols-2">
        {question.options.map((option, index) => {
          const style = ANSWER_STYLES[index];
          const Icon = style.icon;
          return (
            <li key={index} className={`flex min-h-[13vh] items-center gap-[1.5vw] rounded-[2rem] px-[2vw] py-[1.5vh] ${style.tile}`}>
              <Icon className="size-[clamp(2rem,3.4vw,4rem)] shrink-0 fill-current" aria-hidden />
              <span className="min-w-0 font-display text-[clamp(1.25rem,2.4vw,3rem)] leading-tight font-semibold break-words">
                <span className="sr-only">{style.name}: </span>
                {option}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-5" aria-live="polite">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Players who answered" aria-valuemin={0} aria-valuemax={session.players} aria-valuenow={answered}>
          <div className="h-full rounded-full bg-neon-cyan transition-[width] duration-500" style={{ width: `${share}%` }} />
        </div>
        <p className="text-[clamp(1rem,1.5vw,1.75rem)] font-bold tabular-nums">
          {answered.toLocaleString("en-US")} <span className="font-normal text-muted">of {session.players.toLocaleString("en-US")} answered</span>
        </p>
      </div>
    </div>
  );
}

function RevealStage({ session }: { session: QuizSession }) {
  const question = session.question!;
  const reveal = session.reveal;
  const counts = reveal?.counts ?? [];
  const total = counts.reduce((sum, count) => sum + count, 0);
  const rightCount = reveal ? (counts[reveal.correctIndex] ?? 0) : 0;
  const rows = (session.leaderboard ?? []).slice(0, 10);

  return (
    <div className="grid flex-1 gap-[3vw] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[2.5vh]">
        <div className="space-y-2">
          <Eyebrow>
            Question {session.position} of {session.questionCount}
          </Eyebrow>
          <h1 className="font-display text-[clamp(1.6rem,2.8vw,3.5rem)] leading-[1.12] font-semibold text-balance">{question.prompt}</h1>
        </div>

        <ul className="flex flex-col gap-[1.4vh]">
          {question.options.map((option, index) => {
            const style = ANSWER_STYLES[index];
            const Icon = style.icon;
            const right = reveal?.correctIndex === index;
            const count = counts[index] ?? 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <li key={index} className={`relative overflow-hidden rounded-2xl border bg-surface ${right ? "border-success shadow-[0_0_30px_rgb(0_230_118/0.25)]" : "border-line opacity-60"}`}>
                <div className={`absolute inset-y-0 left-0 ${style.solid} opacity-30 transition-[width] duration-700`} style={{ width: `${percent}%` }} aria-hidden />
                <div className="relative flex items-center gap-[1.2vw] px-[1.4vw] py-[1.4vh]">
                  <span className={`grid size-[clamp(2.5rem,3.4vw,4rem)] shrink-0 place-items-center rounded-xl ${style.tile}`}>
                    <Icon className="size-[55%] fill-current" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-[clamp(1.1rem,1.9vw,2.25rem)] leading-tight font-semibold break-words">
                    <span className="sr-only">{style.name}: </span>
                    {option}
                    {right && <span className="sr-only"> (correct answer)</span>}
                  </span>
                  {right && <Check className="size-[clamp(1.5rem,2.4vw,3rem)] shrink-0 text-success" aria-hidden />}
                  <span className="w-[6ch] text-right font-display text-[clamp(1.25rem,2.2vw,2.75rem)] font-bold tabular-nums">
                    {count.toLocaleString("en-US")}
                    <span className="block text-[0.45em] font-medium text-muted">{Math.round(percent)}%</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-[clamp(1.1rem,1.7vw,2rem)] text-muted">
          {total === 0 ? (
            "Nobody answered this one."
          ) : (
            <>
              <b className="text-success">
                {rightCount} of {total}
              </b>{" "}
              got it right.
            </>
          )}
        </p>
      </div>

      <section aria-labelledby="top-heading" className="flex flex-col gap-[2vh]">
        <h2 id="top-heading" className="flex items-center gap-3 font-display text-[clamp(1.4rem,2.2vw,2.75rem)] font-semibold">
          <Trophy className="size-[1.1em] text-gold" aria-hidden /> Top {rows.length > 0 ? Math.min(10, rows.length) : 10}
        </h2>
        <StageBoard rows={rows} />
      </section>
    </div>
  );
}

/** The leaderboard at stage size, a little tighter on short screens so ten rows always fit. */
function StageBoard({ rows }: { rows: { id: string; rank: number; name: string; score: number }[] }) {
  return (
    <div className="[&_li]:!py-[0.9vh] [&_ol]:space-y-[0.9vh]">
      <Leaderboard rows={rows} size="stage" />
    </div>
  );
}

function FinishedStage({ session }: { session: QuizSession }) {
  const rows = session.leaderboard ?? [];
  const podium = [rows[1], rows[0], rows[2]];
  const heights = ["h-[28vh]", "h-[38vh]", "h-[22vh]"];
  const rest = rows.slice(3, 10);

  return (
    <div className="m-auto flex w-full max-w-[110rem] flex-1 flex-col gap-[3vh]">
      <div className="space-y-2 text-center">
        <Eyebrow>{session.quizTitle}</Eyebrow>
        <h1 className="font-display text-[clamp(2.5rem,5vw,6rem)] leading-none font-semibold">Final results</h1>
      </div>

      {rows.length === 0 ? (
        <p className="m-auto text-[clamp(1.25rem,2vw,2.5rem)] text-muted">Nobody played this time.</p>
      ) : (
        <div className={`grid flex-1 items-end gap-[3vw] ${rest.length > 0 ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}>
          <ol className="grid grid-cols-3 items-end gap-[1.5vw]" aria-label="Podium">
            {podium.map((row, slot) => {
              if (!row) return <li key={slot} />;
              const first = row.rank === 1;
              return (
                <li key={row.id} className="flex flex-col items-center gap-3 text-center">
                  {first && <Crown className="size-[clamp(2.5rem,4vw,5rem)] text-gold" aria-hidden />}
                  <p className="max-w-full truncate font-display text-[clamp(1.1rem,2vw,2.5rem)] font-semibold">{row.name}</p>
                  <p className={`font-display text-[clamp(1.25rem,2.2vw,2.75rem)] font-bold tabular-nums ${first ? "text-neon-cyan" : "text-zinc-300"}`}>{row.score.toLocaleString("en-US")}</p>
                  <div
                    className={`grid w-full place-items-start rounded-t-[2rem] pt-[2vh] font-display text-[clamp(2.5rem,5vw,6rem)] leading-none font-bold ${heights[slot]} ${
                      first ? "bg-gradient-to-b from-gold to-gold/40 text-black shadow-gold" : "border border-b-0 border-line-strong bg-panel-raised text-zinc-400"
                    }`}
                  >
                    <span className="mx-auto">{row.rank}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          {rest.length > 0 && <StageBoard rows={rest} />}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ control bar

function ControlBar({
  visible,
  base,
  session,
  primary,
  busy,
  error,
  autoReveal,
  onAutoReveal,
  confirmEnd,
  onConfirmEnd,
  onRun,
  onPickAnother,
  picking,
  hasLeaderboard,
}: {
  visible: boolean;
  base: string;
  session: QuizSession | null;
  primary: { action: Action; label: string } | null;
  busy: string | null;
  error: string | null;
  autoReveal: boolean;
  onAutoReveal: (next: boolean) => void;
  confirmEnd: boolean;
  onConfirmEnd: (next: boolean) => void;
  onRun: (action: Action) => void;
  onPickAnother: () => void;
  picking: boolean;
  hasLeaderboard: boolean;
}) {
  const live = session && session.phase !== "finished";
  const PrimaryIcon = primary?.action === "start" ? Play : primary?.action === "reveal" ? Expand : SkipForward;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-[2.5vw] pb-[2vh] transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100"
      }`}
    >
      {error && (
        <p role="alert" className="max-w-3xl rounded-2xl border border-danger/40 bg-ink/95 px-5 py-3 text-center text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-[2rem] border border-line-strong bg-ink/90 p-3 shadow-2xl backdrop-blur">
        <Link href={base} className={buttonStyles({ variant: "ghost" })}>
          <X className="size-4" aria-hidden /> Exit
        </Link>

        {live && !picking && primary && (
          <Button variant="neon" size="lg" disabled={busy !== null} onClick={() => onRun(primary.action)}>
            <PrimaryIcon className="size-5" aria-hidden /> {busy === primary.action ? "One moment…" : primary.label}
            <kbd className="ml-1 rounded-md border border-black/30 bg-black/10 px-2 py-0.5 text-xs font-bold">Space</kbd>
          </Button>
        )}

        {session?.phase === "finished" && !picking && (
          <Button variant="neon" size="lg" onClick={onPickAnother}>
            <Play className="size-5" aria-hidden /> Run another quiz
          </Button>
        )}

        {live && !picking && session.phase === "question" && (
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-muted hover:text-fg">
            <input type="checkbox" checked={autoReveal} onChange={(event) => onAutoReveal(event.target.checked)} className="size-4 accent-[var(--color-neon-cyan)]" />
            Reveal by itself
          </label>
        )}

        {live && !picking &&
          (confirmEnd ? (
            <span className="flex items-center gap-2" role="group" aria-label="End the quiz?">
              <span className="text-sm font-bold">End the quiz now?</span>
              <Button variant="danger" disabled={busy !== null} onClick={() => onRun("end")}>
                Yes, end it
              </Button>
              <Button variant="ghost" onClick={() => onConfirmEnd(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => onConfirmEnd(true)}>
              <Square className="size-4" aria-hidden /> End quiz
            </Button>
          ))}

        <Button variant="ghost" onClick={() => void toggleFullscreen()} aria-label="Toggle full screen">
          <Maximize2 className="size-4" aria-hidden /> Full screen
        </Button>
        {hasLeaderboard && <span className="sr-only">The leaderboard is on screen.</span>}
      </div>
    </div>
  );
}
