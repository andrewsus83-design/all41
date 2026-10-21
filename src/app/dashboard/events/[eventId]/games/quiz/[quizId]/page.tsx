import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { getQuiz } from "@/lib/games/host";
import { GoLiveButton } from "../../go-live-button";
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";
import { QuizSettings } from "./quiz-settings";

export const metadata: Metadata = { title: "Edit quiz" };

type Props = PageProps<"/dashboard/events/[eventId]/games/quiz/[quizId]">;

export default function QuizEditorPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <QuizEditor params={props.params} />
    </Suspense>
  );
}

const MAX_QUESTIONS = 50;

async function QuizEditor({ params }: { params: Props["params"] }) {
  const { eventId, quizId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  const [workspace, quiz] = await Promise.all([getWorkspace(), getQuiz(eventId, quizId)]);
  if (!quiz) notFound();

  const isOwner = workspace?.role === "owner";
  const locked = quiz.sessionCount > 0;
  const canEdit = isOwner && !locked;
  const base = `/dashboard/events/${eventId}/games`;

  return (
    <div className="space-y-6">
      <Link href={base} className="text-sm text-muted hover:text-fg">
        ← Games
      </Link>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-semibold break-words">{quiz.title}</h2>
              {quiz.live && <Badge tone="cyan">Live now</Badge>}
              {locked && !quiz.live && <Badge tone="gold">Played</Badge>}
            </div>
            <p className="mt-1 text-muted">
              {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
            </p>
          </div>
          {quiz.live ? (
            <Link href={`${base}/quiz/host`} className="font-bold text-neon-cyan underline-offset-4 hover:underline">
              Open the host screen
            </Link>
          ) : (
            quiz.questions.length > 0 && <GoLiveButton eventId={eventId} quizId={quiz.id} label={locked ? "Play again" : "Go live"} />
          )}
        </div>

        {locked && (
          <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold" role="note">
            This quiz has been played, so its questions are locked and the results stay safe. {isOwner ? "Clear the results below to edit it again, or make a new quiz." : "An owner can clear the results to edit it again."}
          </p>
        )}
        {!isOwner && (
          <p className="text-sm text-muted" role="note">
            You can run this quiz from the host screen. Only owners edit questions.
          </p>
        )}
      </Card>

      {quiz.questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">No questions yet.{canEdit ? " Add the first one below." : ""}</p>
      ) : (
        <ol className="space-y-3" aria-label="Questions">
          {quiz.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              eventId={eventId}
              quizId={quiz.id}
              question={question}
              number={index + 1}
              isFirst={index === 0}
              isLast={index === quiz.questions.length - 1}
              canEdit={canEdit}
            />
          ))}
        </ol>
      )}

      {canEdit &&
        (quiz.questions.length >= MAX_QUESTIONS ? (
          <p className="text-sm text-muted">A quiz can have up to {MAX_QUESTIONS} questions.</p>
        ) : (
          <Card className="space-y-4 p-6 sm:p-8">
            <h3 className="font-display text-lg font-semibold">Add a question</h3>
            <QuestionForm eventId={eventId} quizId={quiz.id} questionId={null} />
          </Card>
        ))}

      {isOwner && <QuizSettings eventId={eventId} quizId={quiz.id} title={quiz.title} played={locked} live={quiz.live} />}
    </div>
  );
}
