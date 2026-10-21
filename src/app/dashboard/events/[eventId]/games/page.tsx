import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { getHostQuizState, getHuntHostBoard, listQuizzes } from "@/lib/games/host";
import { CreateQuizForm } from "./create-quiz-form";
import { GoLiveButton } from "./go-live-button";

export const metadata: Metadata = { title: "Games" };

type Props = PageProps<"/dashboard/events/[eventId]/games">;

export default function GamesPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <Games params={props.params} />
    </Suspense>
  );
}

const PHASE_LABELS = { lobby: "In the lobby", question: "Question open", reveal: "Showing the answer", finished: "Finished" } as const;

async function Games({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [workspace, quizzes, state, hunt] = await Promise.all([getWorkspace(), listQuizzes(eventId), getHostQuizState(eventId), getHuntHostBoard(eventId)]);
  const isOwner = workspace?.role === "owner";
  const base = `/dashboard/events/${eventId}/games`;
  const live = state.session && state.session.phase !== "finished" ? state.session : null;

  return (
    <div className="space-y-8">
      {event.status !== "published" && (
        <Card className="border-warning/30 bg-warning/5 p-5 text-sm">
          <b className="text-warning">This event is not published yet.</b> <span className="text-muted">Guests can only join a game once the event is published. You can still set everything up.</span>
        </Card>
      )}

      {live && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-neon-cyan/40 p-6 shadow-neon">
          <div>
            <div className="flex items-center gap-3">
              <Badge tone="cyan">Live now</Badge>
              <span className="font-display text-xl font-semibold">{live.quizTitle}</span>
            </div>
            <p className="mt-1 text-muted">
              {PHASE_LABELS[live.phase]} · {live.players} {live.players === 1 ? "player" : "players"}
            </p>
          </div>
          <Link href={`${base}/quiz/host`} className={buttonStyles({ variant: "neon" })}>
            Open the host screen
          </Link>
        </Card>
      )}

      <section aria-labelledby="quiz-heading" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="space-y-6 p-6 sm:p-8">
          <div>
            <h2 id="quiz-heading" className="font-display text-2xl font-semibold">
              Live quiz
            </h2>
            <p className="mt-1 text-muted">Questions on the big screen, answers on every phone, points for speed. Guests join with their invitation link.</p>
          </div>

          {quizzes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">No quiz yet. Create the first one.</p>
          ) : (
            <ul className="space-y-3">
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{quiz.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                      {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
                      {quiz.played && <Badge tone="gold">Played</Badge>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`${base}/quiz/${quiz.id}`} className={buttonStyles({ variant: "secondary" })}>
                      {isOwner ? "Edit questions" : "View questions"}
                    </Link>
                    {quiz.questionCount > 0 && !live && <GoLiveButton eventId={eventId} quizId={quiz.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isOwner && (
          <Card className="h-fit space-y-4 p-6 sm:p-8">
            <h3 className="font-display text-lg font-semibold">New quiz</h3>
            <CreateQuizForm eventId={eventId} />
          </Card>
        )}
      </section>

      <section aria-labelledby="hunt-heading">
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="hunt-heading" className="font-display text-2xl font-semibold">
                Scavenger hunt
              </h2>
              <p className="mt-1 max-w-2xl text-muted">Print a QR code for each mission and hide them around the venue. Guests scan with their phone and the points add up by themselves.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`${base}/hunt`} className={buttonStyles({ variant: "secondary" })}>
                {isOwner ? "Manage missions" : "View the hunt"}
              </Link>
              {hunt.missions.length > 0 && (
                <Link href={`${base}/hunt/print`} className={buttonStyles({ variant: "secondary" })}>
                  Print QR sheet
                </Link>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Missions", hunt.missions.length],
              ["Active", hunt.missions.filter((mission) => mission.active).length],
              ["Guests playing", hunt.players],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
                <dt className="text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  );
}
