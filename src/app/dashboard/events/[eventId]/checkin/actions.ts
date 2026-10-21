"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { addWalkIn, checkInByToken, checkInGuest, getEventRole, removeCheckin } from "@/lib/checkin/queries";
import {
  NO_ACCESS,
  OWNER_ONLY_UNDO,
  SIGNED_OUT,
  TRY_AGAIN,
  checkinProblem,
  walkInProblem,
} from "@/lib/checkin/errors";
import type { CheckinResult } from "@/lib/checkin/records";
import { extractToken } from "@/lib/checkin/scan";
import { getEvent } from "@/lib/events/queries";
import { fieldErrorsOf, formObject, type FormState } from "@/lib/forms";
import { guestSchema } from "@/lib/guests/input";
import { createClient } from "@/lib/supabase/server";

// Every action here asks who is calling and lets the database decide what they may
// do: the functions behind them check the event's membership with the caller's own
// token. The event id comes from the page the person is on, and is checked again
// there, never taken on trust.

/** What the door can show: a database answer, or text that is not a guest pass at all. */
export type ScanOutcome = CheckinResult | { outcome: "not_a_pass" };

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string; signedOut?: boolean };

const isUuid = (value: string) => z.uuid().safeParse(value).success;

async function signedIn() {
  return (await getCurrentUser()) !== null;
}

const signedOut = { ok: false, error: SIGNED_OUT, signedOut: true } as const;

/** A guest's QR code was scanned. `text` is whatever the camera read. */
export async function scanPass(eventId: string, text: string): Promise<ActionResult<ScanOutcome>> {
  if (!(await signedIn())) return signedOut;
  if (!isUuid(eventId)) return { ok: false, error: NO_ACCESS };

  const token = extractToken(String(text).slice(0, 2000));
  if (!token) return { ok: true, value: { outcome: "not_a_pass" } };

  const supabase = await createClient();
  const result = await checkInByToken(supabase, eventId, token);
  return result.ok ? result : { ok: false, error: checkinProblem(result.error).error ?? TRY_AGAIN };
}

/** A guest was picked from the search. */
export async function checkInFromList(eventId: string, guestId: string): Promise<ActionResult<CheckinResult>> {
  if (!(await signedIn())) return signedOut;
  if (!isUuid(eventId) || !isUuid(guestId)) return { ok: false, error: NO_ACCESS };

  const supabase = await createClient();
  const result = await checkInGuest(supabase, eventId, guestId);
  return result.ok ? result : { ok: false, error: checkinProblem(result.error).error ?? TRY_AGAIN };
}

/** Owners only: takes a guest back out of the checked-in list. */
export async function undoCheckIn(eventId: string, guestId: string): Promise<ActionResult<null>> {
  if (!(await signedIn())) return signedOut;
  if (!isUuid(eventId) || !isUuid(guestId)) return { ok: false, error: NO_ACCESS };

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: NO_ACCESS };
  if ((await getEventRole(event)) !== "owner") return { ok: false, error: OWNER_ONLY_UNDO };

  const supabase = await createClient();
  const removed = await removeCheckin(supabase, eventId, guestId);
  if (!removed.ok) return { ok: false, error: checkinProblem(removed.error).error ?? TRY_AGAIN };
  if (!removed.value) return { ok: false, error: "That guest is not checked in any more." };
  return { ok: true, value: null };
}

export interface WalkInState extends FormState {
  result?: CheckinResult;
}

const walkInSchema = guestSchema.pick({ name: true, email: true, phone: true, tableNo: true });

/** Owners only: adds a guest at the door and checks them in. Respects the paid guest capacity. */
export async function addWalkInGuest(eventId: string, _previous: WalkInState, formData: FormData): Promise<WalkInState> {
  if (!(await signedIn())) return { error: SIGNED_OUT };
  if (!isUuid(eventId)) return { error: NO_ACCESS };

  const values = formObject(formData);
  const parsed = walkInSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const result = await addWalkIn(supabase, eventId, parsed.data);
  if (!result.ok) {
    if (result.error.code !== "23514" && result.error.code !== "23505" && result.error.code !== "42501") {
      console.error("[a41] walk-in failed", result.error.code, result.error.message);
    }
    return { ...walkInProblem(result.error), values };
  }
  return { saved: true, result: result.value };
}
