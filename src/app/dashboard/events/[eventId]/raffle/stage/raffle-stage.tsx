"use client";

import { ArrowRight, Maximize2, RotateCcw, Trophy, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { nextPrize, type DrawResult, type RafflePrize } from "@/lib/raffle/records";
import { drawForPrize, redrawAbsent, refreshStage } from "../actions";
import "./stage.css";
import { useStageSound } from "./use-stage-sound";

interface StageTheme {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  serif: boolean;
}

interface Winner {
  drawId: string;
  prizeId: string;
  prizeName: string;
  name: string;
  tableNo: string | null;
}

type Phase = { kind: "idle" } | { kind: "spinning"; result: DrawResult } | { kind: "revealed"; result: DrawResult };

const REEL_STEPS = 30;

const winnerFromDraw = (result: DrawResult): Winner => ({
  drawId: result.drawId,
  prizeId: result.prize.id,
  prizeName: result.prize.name,
  name: result.winner.name,
  tableNo: result.winner.tableNo,
});

/** A name that fits the screen: the longer it is, the smaller the type. */
const nameSize = (name: string) => (name.length > 34 ? "text-[7vh]" : name.length > 22 ? "text-[9.5vh]" : name.length > 14 ? "text-[12vh]" : "text-[15vh]");

/**
 * The raffle on the projector. The server draws first and says who won; the reel
 * here is only for show and always lands on that name. Buttons are big enough to
 * hit from across a stage, and Space or Enter does the main thing.
 */
export function RaffleStage({
  eventId,
  eventName,
  theme,
  backHref,
  prizes: initialPrizes,
  remaining: initialRemaining,
  winners: initialWinners,
}: {
  eventId: string;
  eventName: string;
  theme: StageTheme;
  backHref: string;
  prizes: RafflePrize[];
  remaining: number;
  winners: Winner[];
}) {
  const [prizes, setPrizes] = useState(initialPrizes);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [winners, setWinners] = useState(initialWinners);
  const [selectedId, setSelectedId] = useState(() => nextPrize(initialPrizes)?.id);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [shown, setShown] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string>();
  const sound = useStageSound();
  const { tick, fanfare, unlock } = sound;

  const selected = prizes.find((prize) => prize.id === selectedId);
  const upcoming = selected && selected.awarded >= selected.quantity ? nextPrize(prizes, selected.id) : selected;
  const current = upcoming && upcoming.awarded < upcoming.quantity ? upcoming : undefined;
  const anyOpen = prizes.some((prize) => prize.awarded < prize.quantity);

  const applyPrize = useCallback((prize: RafflePrize, left: number) => {
    setPrizes((now) => now.map((candidate) => (candidate.id === prize.id ? { ...candidate, awarded: prize.awarded, quantity: prize.quantity } : candidate)));
    setRemaining(left);
  }, []);

  const resync = useCallback(async () => {
    try {
      const result = await refreshStage(eventId);
      if (result.ok) {
        setPrizes(result.value.prizes);
        setRemaining(result.value.remaining);
        setSelectedId((id) => (result.value.prizes.some((prize) => prize.id === id && prize.awarded < prize.quantity) ? id : nextPrize(result.value.prizes)?.id));
      }
    } catch {
      // The next action will say if the connection is the problem.
    }
  }, [eventId]);

  const startReel = useCallback((result: DrawResult) => {
    setNotice(undefined);
    setConfirming(false);
    setShown("");
    setPhase({ kind: "spinning", result });
  }, []);

  const draw = useCallback(async () => {
    if (!current || busy) return;
    unlock();
    setBusy(true);
    setNotice(undefined);
    try {
      const result = await drawForPrize(eventId, current.id);
      if (!result.ok) {
        setNotice(result.error);
        void resync();
        return;
      }
      applyPrize(result.value.prize, result.value.remaining);
      setWinners((now) => [...now, winnerFromDraw(result.value)]);
      startReel(result.value);
    } catch {
      setNotice("No connection. The draw did not happen. Try again.");
    } finally {
      setBusy(false);
    }
  }, [current, busy, eventId, unlock, applyPrize, startReel, resync]);

  const redraw = useCallback(async () => {
    if (phase.kind !== "revealed" || busy) return;
    unlock();
    setBusy(true);
    setConfirming(false);
    const previous = phase.result;
    try {
      const result = await redrawAbsent(eventId, previous.drawId, previous.prize.id);
      if (!result.ok) {
        setNotice(result.error);
        if (result.forfeited) {
          // the absent winner is recorded; only the new draw failed
          applyPrize(result.forfeited.prize, result.forfeited.remaining);
          setWinners((now) => now.filter((winner) => winner.drawId !== previous.drawId));
          setPhase({ kind: "idle" });
        } else {
          void resync();
        }
        return;
      }
      applyPrize(result.draw.prize, result.draw.remaining);
      setWinners((now) => [...now.filter((winner) => winner.drawId !== previous.drawId), winnerFromDraw(result.draw)]);
      startReel(result.draw);
    } catch {
      setNotice("No connection. Nothing changed. Try again.");
    } finally {
      setBusy(false);
    }
  }, [phase, busy, eventId, unlock, applyPrize, startReel, resync]);

  const next = useCallback(() => {
    if (phase.kind !== "revealed") return;
    const prize = prizes.find((candidate) => candidate.id === phase.result.prize.id);
    const after = prize && prize.awarded < prize.quantity ? prize : nextPrize(prizes, prize?.id);
    setSelectedId(after?.id);
    setConfirming(false);
    setNotice(undefined);
    setPhase({ kind: "idle" });
  }, [phase, prizes]);

  // The reel: names flash by, slowing down, and land on the winner the server chose.
  useEffect(() => {
    if (phase.kind !== "spinning") return;
    const { result } = phase;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = reduced ? 0 : REEL_STEPS;
    const names = result.decoys.length > 0 ? result.decoys : [result.winner.name];
    let step = 0;
    let last = "";
    let timer: ReturnType<typeof setTimeout>;

    const run = () => {
      if (step >= steps) {
        setShown(result.winner.name);
        timer = setTimeout(() => {
          fanfare();
          setPhase({ kind: "revealed", result });
        }, reduced ? 0 : 900);
        return;
      }
      let name = names[Math.floor(Math.random() * names.length)];
      if (names.length > 1 && name === last) name = names[(names.indexOf(name) + 1) % names.length];
      last = name;
      setShown(name);
      tick(step / steps);
      timer = setTimeout(run, 40 + Math.pow(step / steps, 2.6) * 460);
      step += 1;
    };

    timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }, [phase, tick, fanfare]);

  // Space or Enter does the main thing, for a presenter with a clicker.
  const primary = phase.kind === "idle" ? draw : phase.kind === "revealed" ? next : undefined;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      if ((event.target as HTMLElement | null)?.closest("button, a, input, select, textarea")) return;
      event.preventDefault();
      void primary?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary]);

  // The stage owns the screen: nothing behind it scrolls.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, index) => ({
        left: (index * 37) % 100,
        delay: -((index * 53) % 40) / 10,
        duration: 3.2 + ((index * 17) % 30) / 10,
        size: 0.8 + ((index * 29) % 10) / 10,
        color: ["var(--stage-accent)", "var(--color-gold)", "var(--color-neon-cyan)", "var(--color-success)", "var(--stage-text)"][index % 5],
      })),
    [],
  );

  const style = {
    "--stage-bg": theme.background,
    "--stage-surface": theme.surface,
    "--stage-text": theme.text,
    "--stage-muted": theme.muted,
    "--stage-accent": theme.accent,
  } as React.CSSProperties;
  const headingFont = theme.serif ? { fontFamily: "Georgia, 'Times New Roman', serif" } : undefined;
  const revealed = phase.kind === "revealed" ? phase.result : null;
  const nextLabel = !revealed
    ? ""
    : revealed.prize.awarded < revealed.prize.quantity
      ? `Next winner (${revealed.prize.awarded + 1} of ${revealed.prize.quantity})`
      : nextPrize(prizes, revealed.prize.id)
        ? "Next prize"
        : "Finish";

  return (
    <div
      style={style}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-(--stage-bg) text-(--stage-text) select-none"
      data-phase={phase.kind}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60vw 50vh at 50% 38%, color-mix(in srgb, var(--stage-accent) 20%, transparent), transparent 70%), radial-gradient(40vw 30vh at 90% 100%, color-mix(in srgb, var(--color-neon-cyan) 8%, transparent), transparent 70%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between gap-6 px-[3vw] py-[2.2vh]">
        <p className="truncate text-[2.6vh] font-bold tracking-wide text-(--stage-muted) uppercase">{eventName}</p>
        <div className="flex items-center gap-3">
          <StageButton label={sound.muted ? "Turn sound on" : "Turn sound off"} onClick={sound.toggle}>
            {sound.muted ? <VolumeX className="size-6" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />}
          </StageButton>
          <StageButton
            label="Full screen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
              else void document.documentElement.requestFullscreen().catch(() => {});
            }}
          >
            <Maximize2 className="size-6" aria-hidden="true" />
          </StageButton>
          <Link
            href={backHref}
            aria-label="Leave the stage"
            title="Leave the stage"
            className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-black/30 text-(--stage-muted) transition-colors hover:text-(--stage-text)"
          >
            <X className="size-6" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        aria-label="Raffle draw"
        className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-[4vw] text-center"
      >
        {notice && (
          <p role="alert" className="absolute top-0 max-w-[70vw] rounded-2xl border border-danger/40 bg-danger/15 px-8 py-4 text-[2.4vh] font-bold text-danger">
            {notice}
          </p>
        )}

        {phase.kind === "idle" && current && (
          <div className="stage-pop flex flex-col items-center gap-[3.5vh]">
            <p className="text-[3vh] font-bold tracking-[0.25em] text-(--stage-accent) uppercase">
              Prize {prizes.findIndex((prize) => prize.id === current.id) + 1} of {prizes.length}
              {current.quantity > 1 ? ` · winner ${current.awarded + 1} of ${current.quantity}` : ""}
            </p>
            <h1 style={headingFont} className="font-display max-w-[88vw] text-[10vh] leading-none font-bold text-balance break-words text-(--stage-text)">
              {current.name}
            </h1>
            {remaining > 0 ? (
              <button
                type="button"
                onClick={() => void draw()}
                disabled={busy}
                className="stage-glow mt-[2vh] inline-flex h-[12vh] items-center gap-5 rounded-[3vh] bg-(--stage-accent) px-[5vw] font-display text-[5vh] font-bold text-black transition-transform active:scale-95 disabled:opacity-60"
              >
                <Trophy className="size-[5vh]" aria-hidden="true" /> {busy ? "Drawing…" : "Draw winner"}
              </button>
            ) : (
              <p className="max-w-[60vw] text-[3vh] text-(--stage-muted)">
                Nobody is left in the draw. Only guests who have checked in can win, and each guest wins once.
              </p>
            )}
            <p className="text-[2.6vh] text-(--stage-muted)">
              <span className="font-bold text-(--stage-text) tabular-nums">{remaining.toLocaleString("en-US")}</span> {remaining === 1 ? "guest is" : "guests are"} in the draw
            </p>
          </div>
        )}

        {phase.kind === "idle" && !current && (
          <div className="stage-pop flex w-full max-w-[90vw] flex-col items-center gap-[3vh]">
            <Trophy className="size-[9vh] text-(--stage-accent)" aria-hidden="true" />
            <h1 style={headingFont} className="font-display text-[8vh] leading-none font-bold">
              {anyOpen || prizes.length === 0 ? (prizes.length === 0 ? "No prizes yet" : "Pick a prize") : "That is every prize. Thank you!"}
            </h1>
            {winners.length > 0 && (
              <ul className="grid max-h-[46vh] w-full grid-cols-2 gap-x-[3vw] gap-y-[1.2vh] overflow-hidden text-left text-[2.4vh]">
                {winners.map((winner) => (
                  <li key={winner.drawId} className="flex justify-between gap-6 border-b border-white/10 pb-[1vh]">
                    <span className="truncate font-bold">{winner.name}</span>
                    <span className="shrink-0 text-(--stage-muted)">{winner.prizeName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {phase.kind === "spinning" && (
          <div className="flex flex-col items-center gap-[4vh]">
            <p className="text-[3vh] font-bold tracking-[0.25em] text-(--stage-accent) uppercase">Drawing · {phase.result.prize.name}</p>
            <p
              key={shown}
              aria-live="off"
              style={headingFont}
              className={`stage-reel-in font-display max-w-[92vw] leading-none font-bold break-words text-(--stage-text) ${nameSize(shown || "·")}`}
            >
              {shown || "…"}
            </p>
          </div>
        )}

        {revealed && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              {confetti.map((piece, index) => (
                <span
                  key={index}
                  className="stage-confetti"
                  style={{
                    left: `${piece.left}%`,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: `${piece.duration}s`,
                    width: `${piece.size}vh`,
                    height: `${piece.size * 1.6}vh`,
                    background: piece.color,
                  }}
                />
              ))}
            </div>
            <div className="stage-pop relative flex flex-col items-center gap-[2.6vh]">
              <div role="status" aria-live="assertive" className="flex flex-col items-center gap-[2.6vh]">
                <p className="text-[3vh] font-bold tracking-[0.3em] text-(--stage-accent) uppercase">
                  Winner · {revealed.prize.name}
                  {revealed.prize.quantity > 1 ? ` (${revealed.prize.awarded} of ${revealed.prize.quantity})` : ""}
                </p>
                <h1 style={headingFont} className={`font-display max-w-[92vw] leading-none font-bold break-words text-(--stage-text) ${nameSize(revealed.winner.name)}`}>
                  {revealed.winner.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4 text-[3.4vh] font-bold">
                  <span className="rounded-full border border-(--stage-accent)/60 bg-(--stage-accent)/15 px-[1.6vw] py-[0.8vh] text-(--stage-accent)">
                    {revealed.winner.tableNo ? `Table ${revealed.winner.tableNo}` : "No table assigned"}
                  </span>
                  {revealed.winner.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/20 px-[1.4vw] py-[0.8vh] text-(--stage-muted)">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-[2vh] flex flex-wrap items-center justify-center gap-5">
                {confirming ? (
                  <div className="flex flex-wrap items-center justify-center gap-4 rounded-[3vh] border border-danger/40 bg-danger/10 px-[2vw] py-[1.6vh]">
                    <p className="text-[2.6vh] font-bold">Mark {revealed.winner.name} absent and draw again?</p>
                    <button
                      type="button"
                      onClick={() => void redraw()}
                      disabled={busy}
                      className="h-[8vh] rounded-[2.4vh] bg-danger px-[2vw] text-[2.8vh] font-bold text-black disabled:opacity-60"
                    >
                      {busy ? "Drawing…" : "Yes, redraw"}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-[8vh] rounded-[2.4vh] border border-white/20 px-[2vw] text-[2.8vh] font-bold">
                      Keep winner
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      disabled={busy}
                      className="inline-flex h-[9vh] items-center gap-3 rounded-[2.6vh] border border-danger/50 bg-danger/10 px-[2.4vw] text-[3vh] font-bold text-danger transition-colors hover:bg-danger hover:text-black"
                    >
                      <RotateCcw className="size-[3.4vh]" aria-hidden="true" /> Redraw (absent)
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex h-[9vh] items-center gap-3 rounded-[2.6vh] bg-(--stage-accent) px-[2.6vw] text-[3vh] font-bold text-black transition-transform active:scale-95"
                    >
                      {nextLabel} <ArrowRight className="size-[3.4vh]" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <footer className="relative z-10 px-[3vw] py-[2.2vh]">
        {prizes.length > 0 && (
          <ol className="flex items-center justify-center gap-3 overflow-hidden">
            {prizes.map((prize, index) => {
              const done = prize.awarded >= prize.quantity;
              const active = current?.id === prize.id && phase.kind === "idle";
              return (
                <li key={prize.id} className="min-w-0">
                  <button
                    type="button"
                    disabled={phase.kind !== "idle" || done}
                    onClick={() => setSelectedId(prize.id)}
                    className={`flex max-w-[22vw] items-center gap-3 rounded-full border px-[1.2vw] py-[1vh] text-[2.1vh] font-bold transition-colors ${
                      active ? "border-(--stage-accent) bg-(--stage-accent) text-black" : done ? "border-white/10 text-(--stage-muted) line-through" : "border-white/20 text-(--stage-text)"
                    }`}
                  >
                    <span className="tabular-nums">{index + 1}</span>
                    <span className="truncate">{prize.name}</span>
                    <span className={`tabular-nums ${active ? "text-black/70" : "text-(--stage-muted)"}`}>
                      {prize.awarded}/{prize.quantity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </footer>
    </div>
  );
}

function StageButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-black/30 text-(--stage-muted) transition-colors hover:text-(--stage-text)"
    >
      {children}
    </button>
  );
}
