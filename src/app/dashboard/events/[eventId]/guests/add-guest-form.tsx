"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { PHONE_HINT } from "@/lib/guests/phone";
import { addGuest } from "../../../actions";

/** Adds guests one at a time. The form clears after each one and keeps focus on the name, so a list can be typed in quickly. */
export function AddGuestForm({ eventId, disabledReason }: { eventId: string; disabledReason?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addGuest.bind(null, eventId), {});
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const control = (name: string) => `${controlStyles(Boolean(errorOf(name)))} h-11`;

  useEffect(() => {
    if (state.saved) nameRef.current?.focus();
  }, [state]);

  if (disabledReason) {
    return <p className="text-sm text-muted">{disabledReason}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fieldId("name")} label="Name" error={errorOf("name")}>
          <input
            ref={nameRef}
            id={fieldId("name")}
            name="name"
            required
            maxLength={160}
            autoComplete="off"
            defaultValue={state.values?.name}
            aria-invalid={errorOf("name") ? true : undefined}
            aria-describedby={describedBy(fieldId("name"), { error: errorOf("name") })}
            className={control("name")}
          />
        </Field>
        <Field id={fieldId("email")} label="Email" optional error={errorOf("email")}>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={state.values?.email}
            aria-invalid={errorOf("email") ? true : undefined}
            aria-describedby={describedBy(fieldId("email"), { error: errorOf("email") })}
            className={control("email")}
          />
        </Field>
        <Field id={fieldId("phone")} label="Phone / WhatsApp" optional error={errorOf("phone")} hint={PHONE_HINT}>
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            autoComplete="off"
            defaultValue={state.values?.phone}
            aria-invalid={errorOf("phone") ? true : undefined}
            aria-describedby={describedBy(fieldId("phone"), { hint: PHONE_HINT, error: errorOf("phone") })}
            className={control("phone")}
          />
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-4">
          <Field id={fieldId("tags")} label="Tags" optional error={errorOf("tags")} hint="Separate with commas.">
            <input
              id={fieldId("tags")}
              name="tags"
              autoComplete="off"
              defaultValue={state.values?.tags}
              placeholder="VIP, Finance"
              aria-invalid={errorOf("tags") ? true : undefined}
              aria-describedby={describedBy(fieldId("tags"), { hint: "hint", error: errorOf("tags") })}
              className={control("tags")}
            />
          </Field>
          <Field id={fieldId("tableNo")} label="Table" optional error={errorOf("tableNo")}>
            <input
              id={fieldId("tableNo")}
              name="tableNo"
              autoComplete="off"
              maxLength={20}
              defaultValue={state.values?.tableNo}
              aria-invalid={errorOf("tableNo") ? true : undefined}
              aria-describedby={describedBy(fieldId("tableNo"), { error: errorOf("tableNo") })}
              className={control("tableNo")}
            />
          </Field>
        </div>
      </div>

      <FormError>{state.error}</FormError>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add guest"}
        </Button>
        {state.saved && (
          <p role="status" className="text-sm text-success">
            Guest added.
          </p>
        )}
      </div>
    </form>
  );
}
