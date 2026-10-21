import { z } from "zod";
import { fieldErrorsOf } from "@/lib/forms";
import { MAX_PARTY_SIZE, MEAL_PREFERENCE_MAX, RSVP_MESSAGE_MAX, RSVP_RESPONSES, type RsvpResponse } from "./records";

/** The answer a guest sends, once the form has been read. */
export interface RsvpInput {
  response: RsvpResponse;
  /** The guest and whoever they bring. Always 1 for a decline. */
  partySize: number;
  mealPreference: string | null;
  message: string | null;
}

const trimmedOrNull = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

/**
 * The RSVP form as the Server Action reads it: every field arrives as text.
 * The browser checks the same limits, and the database checks them once more,
 * but nothing the browser sends is trusted.
 */
const rsvpFormSchema = z
  .object({
    response: z.enum(RSVP_RESPONSES, "Choose whether you can come."),
    partySize: z.string().optional(),
    mealPreference: z.string().optional(),
    message: z.string().optional(),
  })
  .transform((form, ctx): RsvpInput => {
    const attending = form.response === "attending";

    let partySize = 1;
    if (attending) {
      const raw = form.partySize?.trim() || "1";
      partySize = /^\d{1,3}$/.test(raw) ? Number(raw) : 0;
      if (partySize < 1 || partySize > MAX_PARTY_SIZE) {
        ctx.addIssue({ code: "custom", path: ["partySize"], message: `Choose a number from 1 to ${MAX_PARTY_SIZE}.` });
      }
    }

    const mealPreference = attending ? trimmedOrNull(form.mealPreference) : null;
    if (mealPreference && mealPreference.length > MEAL_PREFERENCE_MAX) {
      ctx.addIssue({ code: "custom", path: ["mealPreference"], message: `Keep this under ${MEAL_PREFERENCE_MAX} characters.` });
    }

    const message = trimmedOrNull(form.message);
    if (message && message.length > RSVP_MESSAGE_MAX) {
      ctx.addIssue({ code: "custom", path: ["message"], message: `Keep your message under ${RSVP_MESSAGE_MAX} characters.` });
    }

    return { response: form.response, partySize, mealPreference, message };
  });

export type RsvpFormResult = { ok: true; input: RsvpInput } | { ok: false; fieldErrors: Record<string, string[]> };

export function parseRsvpForm(values: Record<string, string>): RsvpFormResult {
  const parsed = rsvpFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, input: parsed.data };
  return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
}

/** Which form field a database complaint is about. */
export const FORM_FIELD_OF_DB_FIELD = {
  response: "response",
  party_size: "partySize",
  meal_preference: "mealPreference",
  message: "message",
} as const;

export const MEAL_SUGGESTIONS = ["No preference", "Halal", "Vegetarian", "Vegan", "Gluten-free", "No seafood", "No nuts"] as const;
