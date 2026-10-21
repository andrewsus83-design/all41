"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { SIGNED_OUT } from "@/lib/checkin/errors";
import { getEventRole } from "@/lib/checkin/queries";
import { getEvent } from "@/lib/events/queries";
import { fieldErrorsOf, formObject, type FormState } from "@/lib/forms";
import { describeRaffleError, classifyRaffleError, RAFFLE_MESSAGES } from "@/lib/raffle/errors";
import { drawWinner, forfeitDraw, loadSummary } from "@/lib/raffle/queries";
import type { DrawResult, ForfeitResult, RaffleSummary } from "@/lib/raffle/records";
import { createClient } from "@/lib/supabase/server";

// Owners manage prizes, owners and staff draw. Each action asks who is calling and
// the database decides again: the draw functions check the event's membership with
// the caller's own token, and the prize tables have row level security for owners.

const OWNER_ONLY = "Only an owner can manage prizes.";
const NO_ACCESS = "You do not have access to this event's raffle.";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string; signedOut?: boolean };

const isUuid = (value: string) => z.uuid().safeParse(value).success;

const prizeSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for the prize.").max(120, "Keep the name under 120 characters."),
  quantity: z.coerce
    .number({ error: "Enter how many winners this prize has." })
    .int("Use a whole number.")
    .min(1, "A prize needs at least one winner.")
    .max(500, "Use at most 500 winners per prize."),
});

async function ownerOf(eventId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: SIGNED_OUT };
  if (!isUuid(eventId)) return { ok: false, error: NO_ACCESS };
  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: NO_ACCESS };
  return (await getEventRole(event)) === "owner" ? { ok: true } : { ok: false, error: OWNER_ONLY };
}

export async function createPrize(eventId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const owner = await ownerOf(eventId);
  if (!owner.ok) return { error: owner.error };

  const values = formObject(formData);
  const parsed = prizeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data: last, error: lastError } = await supabase
    .from("a41_raffle_prizes")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (lastError) return { error: describeRaffleError(lastError), values };

  const { error } = await supabase
    .from("a41_raffle_prizes")
    .insert({ event_id: eventId, name: parsed.data.name, quantity: parsed.data.quantity, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
  if (error) return { error: describeRaffleError(error), values };

  refresh();
  return { saved: true };
}

export async function updatePrize(eventId: string, prizeId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const owner = await ownerOf(eventId);
  if (!owner.ok) return { error: owner.error };
  if (!isUuid(prizeId)) return { error: RAFFLE_MESSAGES.prize_not_found };

  const values = formObject(formData);
  const parsed = prizeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_raffle_prizes")
    .update({ name: parsed.data.name, quantity: parsed.data.quantity })
    .eq("id", prizeId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    // the quantity rule is about one field, so it is shown next to it
    if (classifyRaffleError(error) === "prize_quantity_below_awarded") return { fieldErrors: { quantity: [describeRaffleError(error)] }, values };
    return { error: describeRaffleError(error), values };
  }
  if (data.length === 0) return { error: RAFFLE_MESSAGES.prize_not_found, values };

  refresh();
  return { saved: true };
}

export async function deletePrize(eventId: string, prizeId: string): Promise<{ error?: string }> {
  const owner = await ownerOf(eventId);
  if (!owner.ok) return { error: owner.error };
  if (!isUuid(prizeId)) return { error: RAFFLE_MESSAGES.prize_not_found };

  const supabase = await createClient();
  const { data, error } = await supabase.from("a41_raffle_prizes").delete().eq("id", prizeId).eq("event_id", eventId).select("id");
  if (error) return { error: describeRaffleError(error) };
  if (data.length === 0) return { error: RAFFLE_MESSAGES.prize_not_found };

  refresh();
  return {};
}

/** Moves a prize one place up or down the order it is drawn in. */
export async function movePrize(eventId: string, prizeId: string, direction: "up" | "down"): Promise<{ error?: string }> {
  const owner = await ownerOf(eventId);
  if (!owner.ok) return { error: owner.error };

  const supabase = await createClient();
  const summary = await loadSummary(supabase, eventId);
  if (!summary.ok) return { error: describeRaffleError(summary.error) };

  const order = summary.value.prizes.map((prize) => prize.id);
  const index = order.indexOf(prizeId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1) return { error: RAFFLE_MESSAGES.prize_not_found };
  if (target < 0 || target >= order.length) return {};

  [order[index], order[target]] = [order[target], order[index]];
  // renumber, so prizes that shared a number before no longer do
  for (const [position, id] of order.entries()) {
    const current = summary.value.prizes.find((prize) => prize.id === id);
    if (current?.sortOrder === position + 1) continue;
    const { error } = await supabase.from("a41_raffle_prizes").update({ sort_order: position + 1 }).eq("id", id).eq("event_id", eventId);
    if (error) return { error: describeRaffleError(error) };
  }

  refresh();
  return {};
}

async function signedIn() {
  return (await getCurrentUser()) !== null;
}

/** The stage asks for the next winner of a prize. The server picks; the screen only animates it. */
export async function drawForPrize(eventId: string, prizeId: string): Promise<ActionResult<DrawResult>> {
  if (!(await signedIn())) return { ok: false, error: SIGNED_OUT, signedOut: true };
  if (!isUuid(eventId) || !isUuid(prizeId)) return { ok: false, error: RAFFLE_MESSAGES.prize_not_found };

  const supabase = await createClient();
  const result = await drawWinner(supabase, prizeId);
  if (!result.ok) return { ok: false, error: describeRaffleError(result.error) };
  return result;
}

export type RedrawResult =
  | { ok: true; forfeited: ForfeitResult; draw: DrawResult }
  | { ok: false; error: string; forfeited?: ForfeitResult; signedOut?: boolean };

/**
 * The winner is not in the room: marks that draw absent and draws another winner
 * for the same prize. Only an open draw can be marked, so a second tap, or a second
 * device, gets an error instead of a second redraw.
 */
export async function redrawAbsent(eventId: string, drawId: string, prizeId: string): Promise<RedrawResult> {
  if (!(await signedIn())) return { ok: false, error: SIGNED_OUT, signedOut: true };
  if (!isUuid(eventId) || !isUuid(drawId) || !isUuid(prizeId)) return { ok: false, error: RAFFLE_MESSAGES.draw_not_found };

  const supabase = await createClient();
  const forfeited = await forfeitDraw(supabase, drawId);
  if (!forfeited.ok) return { ok: false, error: describeRaffleError(forfeited.error) };

  const drawn = await drawWinner(supabase, prizeId);
  if (!drawn.ok) return { ok: false, error: describeRaffleError(drawn.error), forfeited: forfeited.value };
  return { ok: true, forfeited: forfeited.value, draw: drawn.value };
}

/** The stage reads the prizes and the pool again, for example after another device drew. */
export async function refreshStage(eventId: string): Promise<ActionResult<RaffleSummary>> {
  if (!(await signedIn())) return { ok: false, error: SIGNED_OUT, signedOut: true };
  if (!isUuid(eventId)) return { ok: false, error: NO_ACCESS };

  const supabase = await createClient();
  const result = await loadSummary(supabase, eventId);
  if (!result.ok) return { ok: false, error: describeRaffleError(result.error) };
  return result;
}
