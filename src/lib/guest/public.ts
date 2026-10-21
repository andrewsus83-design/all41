import "server-only";

import { createAnonClient } from "@/lib/supabase/anon";
import { looksLikeSlug, looksLikeToken } from "./links";
import {
  parseInvitation,
  parsePublicEvent,
  parseSubmitResult,
  type Invitation,
  type PublicEvent,
  type SubmitRsvpResult,
} from "./records";
import type { RsvpInput } from "./rsvp";

// What a guest who is not signed in can ask the database. Every call goes
// through a public a41_* function that checks the slug or the invitation token
// itself; a made-up, draft-event or archived-event address all look the same.

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

/** The public page of a published event, or null for any address that is not one. */
export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  if (!looksLikeSlug(slug)) return null;
  const { data, error } = await createAnonClient().rpc("a41_public_event", { p_slug: slug });
  if (error) fail("the event", error);
  return parsePublicEvent(data);
}

/**
 * Opens a personal invitation: who it is for, the event and the answer so far.
 * Opening it also marks the guest as having opened their invitation. Null for
 * a token that does not belong to a guest of a published event.
 */
export async function openInvitation(token: string): Promise<Invitation | null> {
  if (!looksLikeToken(token)) return null;
  const { data, error } = await createAnonClient().rpc("a41_open_invitation", { p_token: token });
  if (error) fail("the invitation", error);
  return parseInvitation(data);
}

/** Sends the guest's answer. The database decides: not found, closed (the event has ended) or invalid. */
export async function submitRsvp(token: string, input: RsvpInput): Promise<SubmitRsvpResult> {
  if (!looksLikeToken(token)) return { ok: false, reason: "not_found" };
  const { data, error } = await createAnonClient().rpc("a41_submit_rsvp", {
    p_token: token,
    p_response: input.response,
    p_party_size: input.partySize,
    p_meal_preference: input.mealPreference,
    p_message: input.message,
  });
  if (error) fail("your answer", error);
  return parseSubmitResult(data);
}
