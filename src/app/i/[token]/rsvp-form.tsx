"use client";

import { Check, X } from "lucide-react";
import { useActionState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { MAX_PARTY_SIZE, MEAL_PREFERENCE_MAX, RSVP_MESSAGE_MAX, type RsvpRecord } from "@/lib/guest/records";
import { MEAL_SUGGESTIONS } from "@/lib/guest/rsvp";
import { submitRsvpAction } from "./actions";

const PARTY_SIZES = Array.from({ length: MAX_PARTY_SIZE }, (_, index) => index + 1);

const choiceStyles =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-line-strong bg-surface px-3 py-3 text-center " +
  "text-sm font-bold transition-colors select-none peer-checked:border-gold peer-checked:bg-gold/10 peer-checked:text-gold " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-neon-cyan peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink";

/**
 * The RSVP form. It is a plain form posting to a Server Action, so it works before
 * the page's JavaScript has loaded, or without it. What only matters when the guest
 * is coming (how many, what to eat) shows through CSS, not script, for the same reason.
 */
export function RsvpForm({
  token,
  existing,
  submitLabel,
  onSaved,
}: {
  token: string;
  existing: RsvpRecord | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRsvpAction.bind(null, token), {});
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const response = value("response", existing?.response ?? "");

  useEffect(() => {
    if (state.saved) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={action} className="space-y-6">
      <fieldset className="group space-y-5">
        <legend className="font-display text-lg font-semibold">Will you join us?</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="relative block cursor-pointer">
            <input type="radio" name="response" value="attending" required defaultChecked={response === "attending"} className="peer sr-only" />
            <span className={choiceStyles}>
              <Check className="size-5" aria-hidden="true" />
              Yes, I will be there
            </span>
          </label>
          <label className="relative block cursor-pointer">
            <input type="radio" name="response" value="declined" defaultChecked={response === "declined"} className="peer sr-only" />
            <span className={choiceStyles}>
              <X className="size-5" aria-hidden="true" />
              Sorry, I cannot come
            </span>
          </label>
        </div>
        {errorOf("response") && (
          <p role="alert" className="text-sm text-danger">
            {errorOf("response")}
          </p>
        )}

        <div className="hidden space-y-5 group-has-[input[value=attending]:checked]:block">
          <Field
            id={fieldId("partySize")}
            label="How many people are coming, including you?"
            error={errorOf("partySize")}
            hint="Your pass is for you. Whoever you bring is counted for seating and food."
          >
            <select
              id={fieldId("partySize")}
              name="partySize"
              defaultValue={value("partySize", String(existing?.partySize ?? 1))}
              aria-invalid={errorOf("partySize") ? true : undefined}
              aria-describedby={describedBy(fieldId("partySize"), { hint: "hint", error: errorOf("partySize") })}
              className={`${controlStyles(Boolean(errorOf("partySize")))} h-12`}
            >
              {PARTY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size === 1 ? "1 (just me)" : size}
                </option>
              ))}
            </select>
          </Field>

          <Field id={fieldId("mealPreference")} label="Meal preference" optional error={errorOf("mealPreference")}>
            <input
              id={fieldId("mealPreference")}
              name="mealPreference"
              list={fieldId("meals")}
              maxLength={MEAL_PREFERENCE_MAX}
              autoComplete="off"
              placeholder="For example: vegetarian"
              defaultValue={value("mealPreference", existing?.mealPreference ?? "")}
              aria-invalid={errorOf("mealPreference") ? true : undefined}
              aria-describedby={describedBy(fieldId("mealPreference"), { error: errorOf("mealPreference") })}
              className={`${controlStyles(Boolean(errorOf("mealPreference")))} h-12`}
            />
            <datalist id={fieldId("meals")}>
              {MEAL_SUGGESTIONS.map((meal) => (
                <option key={meal} value={meal} />
              ))}
            </datalist>
          </Field>
        </div>
      </fieldset>

      <Field id={fieldId("message")} label="A message for the host" optional error={errorOf("message")}>
        <textarea
          id={fieldId("message")}
          name="message"
          rows={3}
          maxLength={RSVP_MESSAGE_MAX}
          defaultValue={value("message", existing?.message ?? "")}
          aria-invalid={errorOf("message") ? true : undefined}
          aria-describedby={describedBy(fieldId("message"), { error: errorOf("message") })}
          className={`${controlStyles(Boolean(errorOf("message")))} py-3`}
        />
      </Field>

      <FormError>{state.error}</FormError>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
