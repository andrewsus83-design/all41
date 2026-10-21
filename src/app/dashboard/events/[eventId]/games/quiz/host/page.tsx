import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { QuizHost } from "./quiz-host";
import { QrCode } from "@/components/qr/qr-code";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { getHostQuizState, getPlayKey, listQuizzes } from "@/lib/games/host";
import { joinUrl } from "@/lib/games/links";

export const metadata: Metadata = { title: "Quiz host screen" };

type Props = PageProps<"/dashboard/events/[eventId]/games/quiz/host">;

export default function QuizHostPage(props: Props) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-ink" aria-hidden="true" />}>
      <Host params={props.params} />
    </Suspense>
  );
}

async function Host({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  const workspace = await getWorkspace();
  if (!workspace) redirect("/dashboard");

  const [state, quizzes, playKey] = await Promise.all([getHostQuizState(eventId), listQuizzes(eventId), getPlayKey(eventId)]);
  const join = joinUrl(playKey);

  return (
    <QuizHost
      eventId={eventId}
      eventName={event.name}
      published={event.status === "published"}
      initialState={state}
      quizzes={quizzes.filter((quiz) => quiz.questionCount > 0).map((quiz) => ({ id: quiz.id, title: quiz.title, questionCount: quiz.questionCount }))}
      joinUrl={join}
      joinQr={<QrCode value={join} size={480} label="QR code to join the quiz" />}
    />
  );
}
