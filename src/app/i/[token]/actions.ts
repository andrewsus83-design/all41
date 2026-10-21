"use server";

import { refresh } from "next/cache";
import { formObject, type FormState } from "@/lib/forms";
import { submitRsvp } from "@/lib/guest/public";
import { FORM_FIELD_OF_DB_FIELD, parseRsvpForm } from "@/lib/guest/rsvp";

// Guests are not signed in: the invitation token is their key, and the database
// function checks it (and that the event is published and still running) itself.
//
// The token travels in a hidden field rather than as a bound argument
// (`action.bind(null, token)`): in this version of Next a bound action used with
// useActionState hangs the server when the form is posted without JavaScript.

export async function submitRsvpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { token = "", ...values } = formObject(formData);
  const parsed = parseRsvpForm(values);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const result = await submitRsvp(token, parsed.input);
  if (result.ok) {
    refresh();
    return { saved: true };
  }

  switch (result.reason) {
    case "closed":
      return { error: "Replies are closed because the event has ended.", values };
    case "invalid":
      return { fieldErrors: { [FORM_FIELD_OF_DB_FIELD[result.field]]: ["Please check this answer."] }, values };
    default:
      return { error: "This invitation is not available any more. Ask your host to send you the link again.", values };
  }
}
