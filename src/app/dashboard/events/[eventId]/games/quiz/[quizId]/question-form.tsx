"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import type { QuizQuestionRecord } from "@/lib/games/host";
import { saveQuestion } from "../../actions";

const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

/** One form for adding a question and for editing one. After saving, an add form clears and an edit form closes. */
export function QuestionForm({
  eventId,
  quizId,
  questionId,
  question,
  onDone,
}: {
  eventId: string;
  quizId: string;
  questionId: string | null;
  question?: QuizQuestionRecord;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuestion.bind(null, eventId, quizId, questionId), {});
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  useEffect(() => {
    if (!state.saved) return;
    if (onDone) onDone();
    else promptRef.current?.focus();
  }, [state, onDone]);

  const correct = value("correct", question ? String(question.correctIndex + 1) : "1");

  return (
    <form action={action} className="space-y-5">
      <Field id={fieldId("prompt")} label="Question" error={errorOf("prompt")}>
        <textarea
          ref={promptRef}
          id={fieldId("prompt")}
          name="prompt"
          required
          rows={2}
          maxLength={300}
          defaultValue={value("prompt", question?.prompt ?? "")}
          aria-invalid={errorOf("prompt") ? true : undefined}
          aria-describedby={describedBy(fieldId("prompt"), { error: errorOf("prompt") })}
          className={`${controlStyles(Boolean(errorOf("prompt")))} py-3`}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-zinc-400">Answers: pick the correct one</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ANSWER_LETTERS.map((letter, index) => {
            const name = `option${index + 1}`;
            const error = errorOf(name);
            return (
              <div key={letter}>
                <div className="flex items-center gap-3">
                  <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-line-strong has-checked:border-success has-checked:bg-success/15 has-focus-visible:ring-2 has-focus-visible:ring-gold">
                    <input type="radio" name="correct" value={index + 1} defaultChecked={correct === String(index + 1)} className="sr-only" aria-label={`Answer ${letter} is the correct one`} />
                    <span aria-hidden className="font-display text-sm font-bold">
                      {letter}
                    </span>
                  </label>
                  <input
                    id={fieldId(name)}
                    name={name}
                    maxLength={120}
                    autoComplete="off"
                    required={index < 2}
                    placeholder={index < 2 ? `Answer ${letter}` : `Answer ${letter} (optional)`}
                    aria-label={`Answer ${letter}`}
                    defaultValue={value(name, question?.options[index] ?? "")}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${fieldId(name)}-error` : undefined}
                    className={`${controlStyles(Boolean(error))} h-11`}
                  />
                </div>
                {error && (
                  <p id={`${fieldId(name)}-error`} role="alert" className="mt-1.5 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {errorOf("correct") && (
          <p role="alert" className="text-sm text-danger">
            {errorOf("correct")}
          </p>
        )}
        <p className="text-sm text-muted">The round button beside an answer marks it as correct. Two answers are enough.</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId("timeLimit")} label="Seconds to answer" error={errorOf("timeLimit")} hint="10 to 60. Faster answers earn more points.">
          <input
            id={fieldId("timeLimit")}
            name="timeLimit"
            type="number"
            inputMode="numeric"
            min={10}
            max={60}
            required
            defaultValue={value("timeLimit", String(question?.timeLimit ?? 20))}
            aria-invalid={errorOf("timeLimit") ? true : undefined}
            aria-describedby={describedBy(fieldId("timeLimit"), { hint: "hint", error: errorOf("timeLimit") })}
            className={`${controlStyles(Boolean(errorOf("timeLimit")))} h-11`}
          />
        </Field>
        <Field id={fieldId("basePoints")} label="Points for a correct answer" error={errorOf("basePoints")} hint="100 to 10,000. A fast answer earns all of it, the last second half.">
          <input
            id={fieldId("basePoints")}
            name="basePoints"
            type="number"
            inputMode="numeric"
            min={100}
            max={10000}
            step={50}
            required
            defaultValue={value("basePoints", String(question?.basePoints ?? 1000))}
            aria-invalid={errorOf("basePoints") ? true : undefined}
            aria-describedby={describedBy(fieldId("basePoints"), { hint: "hint", error: errorOf("basePoints") })}
            className={`${controlStyles(Boolean(errorOf("basePoints")))} h-11`}
          />
        </Field>
      </div>

      <FormError>{state.error}</FormError>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : question ? "Save question" : "Add question"}
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        {state.saved && !onDone && (
          <p role="status" className="text-sm text-success">
            Question added.
          </p>
        )}
      </div>
    </form>
  );
}
