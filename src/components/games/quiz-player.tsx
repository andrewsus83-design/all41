"use client";

import { Check, Clock, Crown, Lock, Radio, Trophy, Users, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerResult, QuizMe, QuizSession, QuizState } from "@/lib/games/schemas";
import { ANSWER_STYLES } from "./answer-style";
import { Leaderboard } from "./leaderboard";
import { newerQuizState } from "./newer-state";
import { postJson } from "./post-json";
import { rememberGuest } from "./remember-guest";
import { useCountdown } from "./use-countdown";
import { usePoll } from "./use-poll";
import { useServerClock } from "./use-server-clock";

type Sent = { sessionId: string; position: number; index: number; status: "sending" | "locked" | "refused"; reason?: string };

const REFUSALS: Record<string, string> = {
  late: "Too late: the time was up before your answer arrived.",
  closed: "That question has already closed.",
  no_session: "The game is not running any more.",
  invalid_choice: "That answer does not exist.",
};

export function QuizPlayer({ token, playKey, firstName, eventName }: { token: string; playKey: string; firstName: string; eventName: string }) {
  const [state, setState] = useState<QuizState | null>(null);
  const [me, setMe] = useState<QuizMe | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  // A message belongs to the question it was about; the next question starts clean.
  const [noticeFor, setNotice] = useState<{ sessionId: string; position: number; text: string } | null>(null);
  const [reachable, setReachable] = useState(true);
  const now = useServerClock();
  const seen = useRef<string>("");

  const session = state?.session ?? null;
  const question = session?.question ?? null;
  const countdown = useCountdown(session?.phase === "question" && question ? question.closesAt : null, now);

  const refreshMe = useCallback(
    (spreadMs: number, join = false) => {
      window.setTimeout(
        async () => {
          try {
            const result = await postJson<QuizMe>(join ? "/api/games/guest/quiz/join" : "/api/games/guest/quiz/me", { token });
            if (result.ok) setMe(result.data);
          } catch {
            // the next change of phase asks again
          }
        },
        Math.random() * spreadMs,
      );
    },
    [token],
  );

  useEffect(() => rememberGuest(playKey, token), [playKey, token]);

  usePoll<QuizState>(`/api/games/state/${playKey}/quiz`, {
    intervalMs: 1500,
    onData: (next) => setState((previous) => newerQuizState(previous, next)),
    onReachable: setReachable,
  });

  // React to the game moving on: join a new session, ask for the own result after a reveal.
  const phase = session?.phase;
  const sessionId = session?.id;
  const position = session?.position;
  useEffect(() => {
    if (!sessionId || !phase) return;
    const marker = `${sessionId}:${phase}:${position}`;
    if (seen.current === marker) return;
    const previous = seen.current.split(":");
    seen.current = marker;
    if (previous[0] !== sessionId) {
      refreshMe(phase === "finished" ? 1500 : 800, phase !== "finished");
    } else if (phase === "reveal" || phase === "finished") {
      // 500 phones asking in the same instant would be a burst; spread them over a second and a half
      refreshMe(1500);
    }
  }, [sessionId, phase, position, refreshMe]);

  // Nothing live yet: the first reply tells us whether a game exists, and knowing who we are is enough.
  useEffect(() => {
    if (state && !state.session && !me) refreshMe(0);
  }, [state, me, refreshMe]);

  async function choose(index: number) {
    if (!session || !question || session.phase !== "question" || session.position === null || sent) return;
    const target = { sessionId: session.id, position: session.position, index };
    setSent({ ...target, status: "sending" });
    setNotice(null);
    const say = (text: string) => setNotice({ sessionId: target.sessionId, position: target.position, text });
    try {
      const result = await postJson<AnswerResult>("/api/games/guest/quiz/answer", { token, position: target.position, choice: index });
      if (!result.ok) {
        setSent(null);
        say("Your answer could not be sent. Tap an answer to try again.");
        return;
      }
      const answer = result.data;
      if (answer.ok) {
        navigator.vibrate?.(30);
        setSent({ ...target, status: "locked" });
      } else if (answer.reason === "already_answered") {
        setSent({ ...target, index: answer.choice ?? index, status: "locked" });
      } else {
        setSent({ ...target, status: "refused", reason: answer.reason });
        say(REFUSALS[answer.reason] ?? "That answer did not count.");
      }
    } catch {
      setSent(null);
      say("Your answer could not be sent. Tap an answer to try again.");
    }
  }

  // An answer given before a reload is known from the database, not from this page.
  const stored = me?.answer && session && me.session?.id === session.id && me.answer.position === session.position ? me.answer : null;
  const picked = sent && session && sent.sessionId === session.id && sent.position === session.position ? sent : null;
  const chosenIndex = picked?.status === "refused" ? null : (picked?.index ?? stored?.choice ?? null);
  const locked = chosenIndex !== null;
  const timeUp = session?.phase === "question" && countdown !== null && countdown.secondsLeft <= 0;
  const notice = noticeFor && session && noticeFor.sessionId === session.id && noticeFor.position === session.position ? noticeFor.text : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-5 pb-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-neon-cyan uppercase">Live quiz</p>
          <p className="truncate font-display text-lg font-semibold">{eventName}</p>
        </div>
        {me && me.joined && (
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-bold" aria-label={`Your score: ${me.score}`}>
            <Trophy className="size-4 text-gold" aria-hidden />
            <span className="tabular-nums">{me.score.toLocaleString("en-US")}</span>
          </div>
        )}
      </header>

      {!reachable && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          <WifiOff className="size-4 shrink-0" aria-hidden /> Connection is weak. Trying again…
        </p>
      )}

      <main className="mt-6 flex flex-1 flex-col">
        {!state ? (
          <Waiting title="Connecting…" body="Getting the game ready." />
        ) : !session ? (
          <Waiting title={`Hi ${firstName}!`} body="No quiz is live right now. Keep this page open and it will start by itself." />
        ) : session.phase === "lobby" ? (
          <Lobby session={session} firstName={firstName} />
        ) : session.phase === "question" && question ? (
          <QuestionView
            session={session}
            countdown={countdown}
            chosenIndex={chosenIndex}
            sending={picked?.status === "sending"}
            locked={locked}
            timeUp={Boolean(timeUp)}
            notice={notice}
            onChoose={choose}
          />
        ) : session.phase === "reveal" && question ? (
          <RevealView session={session} me={me} chosenIndex={chosenIndex} />
        ) : (
          <FinishedView session={session} me={me} />
        )}
      </main>
    </div>
  );
}

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-neon-cyan/10 text-neon-cyan shadow-neon">
        <Radio className="size-9 animate-pulse" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="text-muted">{body}</p>
      </div>
    </div>
  );
}

function Lobby({ session, firstName }: { session: QuizSession; firstName: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="grid size-24 place-items-center rounded-full bg-neon-cyan/10 text-neon-cyan shadow-neon">
        <Users className="size-10" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">You are in, {firstName}!</h1>
        <p className="text-lg text-muted">{session.quizTitle}</p>
      </div>
      <p className="rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-5 py-2 font-bold text-neon-cyan">
        {session.players.toLocaleString("en-US")} {session.players === 1 ? "player" : "players"} in the lobby
      </p>
      <p className="text-muted">Waiting for the host to start. Keep your screen on.</p>
    </div>
  );
}

function QuestionView({
  session,
  countdown,
  chosenIndex,
  sending,
  locked,
  timeUp,
  notice,
  onChoose,
}: {
  session: QuizSession;
  countdown: ReturnType<typeof useCountdown>;
  chosenIndex: number | null;
  sending: boolean;
  locked: boolean;
  timeUp: boolean;
  notice: string | null;
  onChoose: (index: number) => void;
}) {
  const question = session.question!;
  const left = countdown?.secondsLeft ?? question.timeLimit;
  const fraction = countdown?.fraction(question.timeLimit) ?? 1;
  const urgent = left <= 5;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="text-muted">
            Question {session.position} of {session.questionCount}
          </span>
          <span className={`flex items-center gap-1.5 font-display text-2xl tabular-nums ${urgent ? "text-danger" : "text-neon-cyan"}`} aria-live="off">
            <Clock className="size-5" aria-hidden />
            {left}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={question.timeLimit} aria-valuenow={left}>
          <div className={`h-full rounded-full ${urgent ? "bg-danger" : "bg-neon-cyan"}`} style={{ width: `${fraction * 100}%`, transition: "width 120ms linear" }} />
        </div>
      </div>

      <h1 className="font-display text-2xl leading-snug font-semibold text-balance">{question.prompt}</h1>

      <div className="flex flex-col gap-3">
        {question.options.map((option, index) => {
          const style = ANSWER_STYLES[index];
          const Icon = style.icon;
          const mine = chosenIndex === index;
          const disabled = locked || sending || timeUp;
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(index)}
              aria-pressed={mine}
              className={`flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl px-5 py-3 text-left text-lg font-bold scale-on-click transition-all ${style.tile} ${
                mine ? "ring-4 ring-white ring-offset-2 ring-offset-ink" : disabled ? "opacity-35" : ""
              }`}
            >
              <Icon className="size-7 shrink-0" aria-hidden />
              <span className="sr-only">{style.name}: </span>
              <span className="flex-1 text-balance">{option}</span>
              {mine && <Check className="size-6 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="min-h-14 text-center" aria-live="polite">
        {notice ? (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{notice}</p>
        ) : sending ? (
          <p className="text-muted">Sending your answer…</p>
        ) : locked ? (
          <p className="flex items-center justify-center gap-2 font-bold text-success">
            <Lock className="size-4" aria-hidden /> Locked in. Waiting for the others…
          </p>
        ) : timeUp ? (
          <p className="font-bold text-muted">Time is up. Watch the screen for the answer.</p>
        ) : (
          <p className="text-sm text-muted">Tap an answer. Faster answers earn more points.</p>
        )}
      </div>
    </div>
  );
}

function RevealView({ session, me, chosenIndex }: { session: QuizSession; me: QuizMe | null; chosenIndex: number | null }) {
  const question = session.question!;
  const reveal = session.reveal;
  // The own result arrives a moment after the reveal, from the database.
  const known = me?.session?.id === session.id && me.session.position === session.position && me.session.phase === "reveal";
  const answer = known && me?.answer?.position === session.position ? me.answer : null;
  const correct = answer?.correct;
  const index = answer?.choice ?? chosenIndex;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="text-sm font-bold text-muted">
        Question {session.position} of {session.questionCount}
      </div>
      <h1 className="font-display text-xl leading-snug font-semibold text-balance">{question.prompt}</h1>

      <div
        className={`rounded-[2rem] border p-6 text-center ${
          !known ? "border-line bg-panel" : correct ? "border-success/40 bg-success/10 shadow-neon" : answer ? "border-danger/40 bg-danger/10" : "border-line bg-panel"
        }`}
        aria-live="polite"
      >
        {!known ? (
          <p className="text-lg text-muted">Checking your answer…</p>
        ) : correct ? (
          <>
            <p className="flex items-center justify-center gap-2 font-display text-3xl font-bold text-success">
              <Check className="size-8" aria-hidden /> Correct!
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-neon-cyan tabular-nums">+{answer?.points?.toLocaleString("en-US")}</p>
          </>
        ) : answer ? (
          <>
            <p className="flex items-center justify-center gap-2 font-display text-3xl font-bold text-danger">
              <X className="size-8" aria-hidden /> Not this time
            </p>
            <p className="mt-2 text-muted">No points for this one.</p>
          </>
        ) : (
          <p className="font-display text-2xl font-semibold text-muted">No answer this time</p>
        )}
        {known && me && me.rank !== null && (
          <p className="mt-4 text-lg">
            You are <b className="font-display text-2xl text-gold">#{me.rank}</b> of {me.players.toLocaleString("en-US")} with{" "}
            <b className="tabular-nums">{me.score.toLocaleString("en-US")}</b> points
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {question.options.map((option, optionIndex) => {
          const style = ANSWER_STYLES[optionIndex];
          const Icon = style.icon;
          const isCorrect = reveal?.correctIndex === optionIndex;
          const mine = index === optionIndex;
          return (
            <li
              key={optionIndex}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-bold ${isCorrect ? `${style.tile} ring-2 ring-success ring-offset-2 ring-offset-ink` : "bg-surface text-zinc-500"}`}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="flex-1 text-balance">{option}</span>
              {isCorrect && <Check className="size-5 shrink-0" aria-label="Correct answer" />}
              {mine && !isCorrect && <span className="text-xs tracking-wide uppercase">Your answer</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-center text-sm text-muted">Look up for the next question.</p>
    </div>
  );
}

function FinishedView({ session, me }: { session: QuizSession; me: QuizMe | null }) {
  const ranked = me?.joined && me.rank !== null;
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-gold/15 text-gold shadow-gold">
          <Crown className="size-8" aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-semibold">Game over</h1>
        <p className="text-muted">{session.quizTitle}</p>
      </div>

      {ranked && me ? (
        <div className="rounded-[2rem] border border-gold/30 bg-panel p-6 text-center shadow-gold">
          <p className="text-sm font-bold tracking-widest text-muted uppercase">Your place</p>
          <p className="font-display text-6xl font-bold text-gold">#{me.rank}</p>
          <p className="mt-2 text-lg">
            <b className="tabular-nums">{me.score.toLocaleString("en-US")}</b> points · {me.correct} of {session.questionCount} correct
          </p>
        </div>
      ) : (
        <p className="text-center text-muted">You were not in this game. Here is how it ended.</p>
      )}

      <section aria-labelledby="top-players" className="space-y-3">
        <h2 id="top-players" className="font-display text-xl font-semibold">
          Top players
        </h2>
        <Leaderboard rows={session.leaderboard ?? []} meId={me?.id} />
      </section>
    </div>
  );
}
