"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import type { HuntHostBoard } from "@/lib/games/schemas";
import { saveMission } from "../actions";

type Mission = HuntHostBoard["missions"][number];

/** Adds a mission or edits one. After saving, an add form clears and an edit form closes. */
export function MissionForm({ eventId, missionId, mission, onDone }: { eventId: string; missionId: string | null; mission?: Mission; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMission.bind(null, eventId, missionId), {});
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const control = (name: string) => `${controlStyles(Boolean(errorOf(name)))} h-11`;

  useEffect(() => {
    if (!state.saved) return;
    if (onDone) onDone();
    else titleRef.current?.focus();
  }, [state, onDone]);

  const codeHint = mission ? "Changing the code makes QR stickers you already printed stop working." : "Leave empty and we make one up. 6 to 24 letters and digits.";

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field id={fieldId("title")} label="Mission" error={errorOf("title")}>
          <input
            ref={titleRef}
            id={fieldId("title")}
            name="title"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Find the golden cup"
            defaultValue={value("title", mission?.title ?? "")}
            aria-invalid={errorOf("title") ? true : undefined}
            aria-describedby={describedBy(fieldId("title"), { error: errorOf("title") })}
            className={control("title")}
          />
        </Field>
        <Field id={fieldId("points")} label="Points" error={errorOf("points")}>
          <input
            id={fieldId("points")}
            name="points"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            required
            defaultValue={value("points", String(mission?.points ?? 100))}
            aria-invalid={errorOf("points") ? true : undefined}
            aria-describedby={describedBy(fieldId("points"), { error: errorOf("points") })}
            className={control("points")}
          />
        </Field>
      </div>
      <Field id={fieldId("hint")} label="Hint for guests" optional error={errorOf("hint")} hint="A clue about where to look. Guests see it before they find the code.">
        <input
          id={fieldId("hint")}
          name="hint"
          maxLength={200}
          autoComplete="off"
          defaultValue={value("hint", mission?.hint ?? "")}
          aria-invalid={errorOf("hint") ? true : undefined}
          aria-describedby={describedBy(fieldId("hint"), { hint: "hint", error: errorOf("hint") })}
          className={control("hint")}
        />
      </Field>
      <Field id={fieldId("code")} label="Secret code" optional={!mission} error={errorOf("code")} hint={codeHint}>
        <input
          id={fieldId("code")}
          name="code"
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          defaultValue={value("code", mission?.code ?? "")}
          aria-invalid={errorOf("code") ? true : undefined}
          aria-describedby={describedBy(fieldId("code"), { hint: "hint", error: errorOf("code") })}
          className={`${control("code")} font-mono tracking-widest uppercase`}
        />
      </Field>

      <FormError>{state.error}</FormError>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mission ? "Save mission" : "Add mission"}
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        {state.saved && !onDone && (
          <p role="status" className="text-sm text-success">
            Mission added.
          </p>
        )}
      </div>
    </form>
  );
}
