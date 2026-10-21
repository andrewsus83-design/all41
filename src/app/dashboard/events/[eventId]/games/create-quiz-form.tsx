"use client";

import { Plus } from "lucide-react";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { createQuiz } from "./actions";

export function CreateQuizForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createQuiz.bind(null, eventId), {});
  const id = useId();
  const error = state.fieldErrors?.title?.[0];

  return (
    <form action={action} className="space-y-4">
      <Field id={`${id}-title`} label="Quiz title" error={error} hint="For example “Company trivia” or “Round 1”.">
        <input
          id={`${id}-title`}
          name="title"
          required
          maxLength={120}
          autoComplete="off"
          defaultValue={state.values?.title}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(`${id}-title`, { error, hint: "hint" })}
          className={`${controlStyles(Boolean(error))} h-12`}
        />
      </Field>
      <FormError>{state.error}</FormError>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" aria-hidden /> {pending ? "Creating…" : "Create quiz"}
      </Button>
    </form>
  );
}
