"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/games/action-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { QuizQuestionRecord } from "@/lib/games/host";
import { deleteQuestion, moveQuestion } from "../../actions";
import { QuestionForm } from "./question-form";

const LETTERS = ["A", "B", "C", "D"] as const;

export function QuestionCard({
  eventId,
  quizId,
  question,
  number,
  isFirst,
  isLast,
  canEdit,
}: {
  eventId: string;
  quizId: string;
  question: QuizQuestionRecord;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <Card className="space-y-4 border-gold/40 p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">Edit question {number}</h3>
          <QuestionForm eventId={eventId} quizId={quizId} questionId={question.id} question={question} onDone={() => setEditing(false)} />
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-72">
            <p className="text-sm font-bold text-subtle">Question {number}</p>
            <p className="mt-1 text-lg font-semibold break-words">{question.prompt}</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {question.options.map((option, index) => {
                const right = index === question.correctIndex;
                return (
                  <li
                    key={index}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm ${right ? "border-success/40 bg-success/10" : "border-line bg-surface"}`}
                  >
                    <span className="font-display font-bold text-subtle" aria-hidden>
                      {LETTERS[index]}
                    </span>
                    <span className="min-w-0 break-words">{option}</span>
                    {right && (
                      <>
                        <Check className="ml-auto size-4 shrink-0 text-success" aria-hidden />
                        <span className="sr-only">(correct)</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-muted tabular-nums">
              {question.timeLimit} seconds · {question.basePoints.toLocaleString("en-US")} points
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton variant="ghost" disabled={isFirst} action={() => moveQuestion(eventId, question.id, -1)} aria-label={`Move question ${number} up`}>
                <ArrowUp className="size-4" aria-hidden />
              </ActionButton>
              <ActionButton variant="ghost" disabled={isLast} action={() => moveQuestion(eventId, question.id, 1)} aria-label={`Move question ${number} down`}>
                <ArrowDown className="size-4" aria-hidden />
              </ActionButton>
              <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Edit question ${number}`}>
                <Pencil className="size-4" aria-hidden /> Edit
              </Button>
              <ActionButton variant="ghost" confirm="Delete this question?" action={() => deleteQuestion(eventId, question.id)} aria-label={`Delete question ${number}`}>
                <Trash2 className="size-4" aria-hidden />
              </ActionButton>
            </div>
          )}
        </div>
      </Card>
    </li>
  );
}
