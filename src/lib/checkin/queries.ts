import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import type { DbError } from "@/lib/db-errors";
import type { EventRecord } from "@/lib/events/records";
import { createClient } from "@/lib/supabase/server";
import {
  parseCheckinResult,
  parseCheckinStats,
  parseSearchResults,
  type CheckinResult,
  type CheckinStats,
  type SearchHit,
} from "./records";

/** The result of a call to the database: a value, or the error to explain. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: DbError };

const failed = (error: DbError): { ok: false; error: DbError } => ({ ok: false, error });

export async function checkInByToken(supabase: SupabaseClient, eventId: string, token: string): Promise<Outcome<CheckinResult>> {
  const { data, error } = await supabase.rpc("a41_check_in_by_token", { p_event: eventId, p_token: token });
  return error ? failed(error) : { ok: true, value: parseCheckinResult(data) };
}

export async function checkInGuest(supabase: SupabaseClient, eventId: string, guestId: string): Promise<Outcome<CheckinResult>> {
  const { data, error } = await supabase.rpc("a41_check_in_guest", { p_event: eventId, p_guest: guestId });
  return error ? failed(error) : { ok: true, value: parseCheckinResult(data) };
}

export interface WalkInInput {
  name: string;
  phone: string | null;
  email: string | null;
  tableNo: string | null;
}

export async function addWalkIn(supabase: SupabaseClient, eventId: string, guest: WalkInInput): Promise<Outcome<CheckinResult>> {
  const { data, error } = await supabase.rpc("a41_add_walk_in", {
    p_event: eventId,
    p_name: guest.name,
    p_phone: guest.phone,
    p_email: guest.email,
    p_table_no: guest.tableNo,
  });
  return error ? failed(error) : { ok: true, value: parseCheckinResult(data) };
}

export async function loadStats(supabase: SupabaseClient, eventId: string, recent = 8): Promise<Outcome<CheckinStats>> {
  const { data, error } = await supabase.rpc("a41_checkin_stats", { p_event: eventId, p_recent: recent });
  return error ? failed(error) : { ok: true, value: parseCheckinStats(data) };
}

export async function searchGuests(supabase: SupabaseClient, eventId: string, query: string): Promise<Outcome<SearchHit[]>> {
  const { data, error } = await supabase.rpc("a41_search_checkin_guests", { p_event: eventId, p_query: query });
  return error ? failed(error) : { ok: true, value: parseSearchResults(data) };
}

/** Removes a check-in. Only owners may: the database refuses anyone else, and says false when the guest was not checked in. */
export async function removeCheckin(supabase: SupabaseClient, eventId: string, guestId: string): Promise<Outcome<boolean>> {
  const { data, error } = await supabase.rpc("a41_undo_check_in", { p_event: eventId, p_guest: guestId });
  return error ? failed(error) : { ok: true, value: data === true };
}

export type EventRole = "owner" | "staff";

/**
 * The signed-in person's role in the organization that owns the event, or null
 * when they are not a member. Memberships are readable by the organization's
 * own members only, so another organization's event resolves to null as well.
 */
export const getEventRole = cache(async (event: Pick<EventRecord, "orgId">): Promise<EventRole | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_memberships")
    .select("role")
    .eq("org_id", event.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your role: ${error.message}`);
  return data?.role === "owner" ? "owner" : data?.role === "staff" ? "staff" : null;
});
