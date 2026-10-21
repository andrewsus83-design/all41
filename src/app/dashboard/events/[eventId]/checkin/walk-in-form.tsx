"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { CheckinResult } from "@/lib/checkin/records";
import { PHONE_HINT } from "@/lib/guests/phone";
import { addWalkInGuest, type WalkInState } from "./actions";

/** Owners add a guest who turned up without an invitation, and check them in with one tap. */
export function WalkInForm({
  eventId,
  onCheckedIn,
  full,
}: {
  eventId: string;
  onCheckedIn: (result: CheckinResult) => void;
  full: boolean;
}) {
  const [state, action, pending] = useActionState<WalkInState, FormData>(addWalkInGuest.bind(null, eventId), {});
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const handled = useRef<WalkInState>(state);
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const control = (name: string) => `${controlStyles(Boolean(errorOf(name)))} h-12`;

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.saved && state.result) {
      onCheckedIn(state.result);
      nameRef.current?.focus();
    }
  }, [state, onCheckedIn]);

  return (
    <details className="group rounded-[2rem] border border-line bg-panel open:border-line-strong">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-display text-lg font-semibold">
        <UserPlus className="size-5 text-gold" aria-hidden="true" />
        Add a walk-in guest
        <span className="ml-auto text-sm font-normal text-muted group-open:hidden">Not on the list</span>
      </summary>
      <form action={action} className="space-y-4 border-t border-line px-5 py-5">
        {full && (
          <p role="status" className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            The guest list is full, so a new guest cannot be added until you make room or add capacity.
          </p>
        )}
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
        <div className="grid grid-cols-[1fr_6rem] gap-4">
          <Field id={fieldId("phone")} label="Phone / WhatsApp" optional error={errorOf("phone")}>
            <input
              id={fieldId("phone")}
              name="phone"
              type="tel"
              autoComplete="off"
              defaultValue={state.values?.phone}
              placeholder="0812…"
              aria-invalid={errorOf("phone") ? true : undefined}
              aria-describedby={describedBy(fieldId("phone"), { hint: PHONE_HINT, error: errorOf("phone") })}
              className={control("phone")}
            />
          </Field>
          <Field id={fieldId("tableNo")} label="Table" optional error={errorOf("tableNo")}>
            <input
              id={fieldId("tableNo")}
              name="tableNo"
              maxLength={20}
              autoComplete="off"
              defaultValue={state.values?.tableNo}
              aria-invalid={errorOf("tableNo") ? true : undefined}
              className={control("tableNo")}
            />
          </Field>
        </div>
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
        <FormError>{state.error}</FormError>
        <Button type="submit" size="lg" className="w-full" disabled={pending || full}>
          {pending ? "Adding…" : "Add and check in"}
        </Button>
      </form>
    </details>
  );
}
