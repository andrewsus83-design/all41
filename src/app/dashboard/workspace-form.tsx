"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { createWorkspace } from "./actions";

/** The one question a new account answers before anything else: what to call their organization. */
export function WorkspaceForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkspace, {});
  const id = `${useId()}-name`;
  const error = state.fieldErrors?.name?.[0];

  return (
    <form action={action} className="space-y-5">
      <Field
        id={id}
        label="Organization name"
        hint="Your company, agency or the name you organize events under. Guests may see it."
        error={error}
      >
        <input
          id={id}
          name="name"
          required
          maxLength={120}
          autoComplete="organization"
          defaultValue={state.values?.name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint: "hint", error })}
          className={`${controlStyles(Boolean(error))} h-12`}
        />
      </Field>
      <FormError>{state.error}</FormError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Setting up…" : "Continue"}
      </Button>
    </form>
  );
}
