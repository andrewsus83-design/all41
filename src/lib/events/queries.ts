import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "./search";
import {
  EVENT_COLUMNS,
  GUEST_COLUMNS,
  GUEST_STATUSES,
  parseEventRow,
  parseGuestRow,
  type EventRecord,
  type GuestRecord,
  type GuestStatus,
} from "./records";

/** PostgREST returns at most this many rows per request, so longer lists are read in pages. */
const PAGE = 1000;

export interface Workspace {
  org: { id: string; name: string };
  role: "owner" | "staff";
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

/** The signed-in user's organization. One per account for now. Null until they set one up. */
export const getWorkspace = cache(async (): Promise<Workspace | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("a41_memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) fail("your organization", error);
  const membership = memberships?.[0];
  if (!membership) return null;

  const { data: org, error: orgError } = await supabase
    .from("a41_organizations")
    .select("id, name")
    .eq("id", membership.org_id)
    .single();
  if (orgError) fail("your organization", orgError);

  return { org: { id: org.id, name: org.name }, role: membership.role === "owner" ? "owner" : "staff" };
});

export async function countGuests(supabase: SupabaseClient, eventId: string, status?: GuestStatus): Promise<number> {
  let query = supabase.from("a41_guests").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  if (error) fail("the guest count", error);
  return count ?? 0;
}

export interface EventSummary extends EventRecord {
  guestCount: number;
}

/** The organization's events, soonest first, with how many guests each holds. */
export async function listEvents(orgId: string): Promise<EventSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_events")
    .select(EVENT_COLUMNS)
    .eq("org_id", orgId)
    .order("starts_at", { ascending: true });
  if (error) fail("your events", error);

  const events = (data ?? []).map(parseEventRow);
  const counts = await Promise.all(events.map((event) => countGuests(supabase, event.id)));
  return events.map((event, index) => ({ ...event, guestCount: counts[index] }));
}

/** Null when the event does not exist or the user cannot see it. Row level security decides. */
export const getEvent = cache(async (eventId: string): Promise<EventRecord | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("a41_events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (error) {
    // A malformed id is simply an event that does not exist.
    if (error.code === "22P02") return null;
    fail("the event", error);
  }
  return data ? parseEventRow(data) : null;
});

export interface GuestQuery {
  search?: string;
  status?: GuestStatus;
  page?: number;
  pageSize?: number;
}

export async function listGuests(eventId: string, { search = "", status, page = 1, pageSize = 50 }: GuestQuery = {}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("a41_guests")
    .select(GUEST_COLUMNS, { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1);

  const term = sanitizeSearch(search);
  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  // PostgREST refuses a page that starts past the last row.
  if (error?.code === "PGRST103") return { guests: [], total: 0, outOfRange: true };
  if (error) fail("the guest list", error);
  return { guests: (data ?? []).map(parseGuestRow), total: count ?? 0, outOfRange: false };
}

/** Every guest of an event, for exports. Reads in pages of 1,000. */
export async function listAllGuests(eventId: string): Promise<GuestRecord[]> {
  const supabase = await createClient();
  const guests: GuestRecord[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("a41_guests")
      .select(GUEST_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail("the guest list", error);
    guests.push(...(data ?? []).map(parseGuestRow));
    if ((data ?? []).length < PAGE) return guests;
  }
}

/** The emails and phones already on an event's list, to spot duplicates before importing. */
export async function listGuestContacts(eventId: string) {
  const supabase = await createClient();
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("a41_guests")
      .select("email, phone")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail("the guest list", error);
    for (const row of data ?? []) {
      if (row.email) emails.add(row.email);
      if (row.phone) phones.add(row.phone);
    }
    if ((data ?? []).length < PAGE) return { emails, phones };
  }
}

export async function guestStatusCounts(eventId: string): Promise<Record<GuestStatus, number>> {
  const supabase = await createClient();
  const counts = await Promise.all(GUEST_STATUSES.map((status) => countGuests(supabase, eventId, status)));
  return Object.fromEntries(GUEST_STATUSES.map((status, index) => [status, counts[index]])) as Record<GuestStatus, number>;
}
