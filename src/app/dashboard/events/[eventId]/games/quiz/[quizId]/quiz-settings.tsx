"use client";

import { useActionState, useId } from "react";
import { ActionButton } from "@/components/games/action-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { clearQuizResults, deleteQuiz, renameQuiz } from "../../actions";

/** Owner-only: rename, throw away the results of earlier games, delete. */
export function QuizSettings({ eventId, quizId, title, played, live }: { eventId: string; quizId: string; title: string; played: boolean; live: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameQuiz.bind(null, eventId, quizId), {});
  const id = useId();
  const error = state.fieldErrors?.title?.[0];

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <h3 className="font-display text-lg font-semibold">Quiz settings</h3>

      <form action={action} className="space-y-3">
        <Field id={`${id}-title`} label="Title" error={error}>
          <div className="flex flex-wrap gap-3">
            <input
              id={`${id}-title`}
              name="title"
              required
              maxLength={120}
              autoComplete="off"
              defaultValue={state.values?.title ?? title}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(`${id}-title`, { error })}
              className={`${controlStyles(Boolean(error))} h-11 min-w-0 flex-1 basis-64`}
            />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "Saving…" : "Rename"}
            </Button>
          </div>
        </Field>
        <FormError>{state.error}</FormError>
        {state.saved && (
          <p role="status" className="text-sm text-success">
            Renamed.
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 border-t border-line pt-6">
        {played && (
          <div className="max-w-md space-y-2">
            <ActionButton variant="secondary" disabled={live} confirm="Delete every result of this quiz?" action={() => clearQuizResults(eventId, quizId)}>
              Clear results
            </ActionButton>
            <p className="text-sm text-muted">{live ? "Finish the live game first." : "Removes the players and scores of every game played with this quiz and unlocks its questions."}</p>
          </div>
        )}
        <div className="max-w-md space-y-2">
          <ActionButton variant="danger" confirm="Delete this quiz and its questions?" action={() => deleteQuiz(eventId, quizId)}>
            Delete quiz
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}
