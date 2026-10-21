"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { classifyDbError, type DbFailure } from "@/lib/db-errors";
import { capacityOf } from "@/lib/events/capacity";
import { countGuests, getEvent, getWorkspace, listGuestContacts } from "@/lib/events/queries";
import { eventFormSchema } from "@/lib/events/schema";
import { fieldErrorsOf, formObject, type FormState } from "@/lib/forms";
import { MAX_IMPORT_ROWS, dedupeGuests } from "@/lib/guests/import";
import { guestSchema, type GuestInput } from "@/lib/guests/input";
import { publicEventTag } from "@/lib/guest/cached";
import { createClient } from "@/lib/supabase/server";

// Every action here checks who is asking itself: the proxy only redirects for
// comfort, and row level security checks the same token once more in the database.

const OWNER_ONLY = "Only an owner of the organization can do that.";
const TRY_AGAIN = "Something went wrong on our side. Please try again.";

type Problem = Pick<FormState, "error" | "fieldErrors">;

/** Turns a database failure into something a person can act on. */
function describeFailure(failure: DbFailure, context: { code?: string; message?: string }): Problem {
  switch (failure) {
    case "slug_taken":
      return { fieldErrors: { slug: ["That address is taken. Pick another."] } };
    case "duplicate_email":
      return { fieldErrors: { email: ["Another guest on this list already has that email."] } };
    case "duplicate_phone":
      return { fieldErrors: { phone: ["Another guest on this list already has that phone number."] } };
    case "guest_capacity_exceeded":
      return { error: "The guest list is full. Remove a guest or add capacity first." };
    case "free_event_limit":
      return { error: "You already have an active Free event. Archive it, or upgrade it, before starting another." };
    case "forbidden":
      return { error: OWNER_ONLY };
    case "archived_event_cannot_publish":
      return { error: "An archived event cannot be published. Restore it in Settings first." };
    case "missing_parent":
      return { error: "That event no longer exists." };
    default:
      // Only the code and message are logged: details can hold a guest's email.
      console.error("[a41] unexpected database error", context.code, context.message);
      return { error: TRY_AGAIN };
  }
}

const problemOf = (error: { code?: string; message?: string; details?: string | null }) =>
  describeFailure(classifyDbError(error), error);

const isUuid = (value: string) => z.uuid().safeParse(value).success;

async function ownerWorkspace() {
  const workspace = await getWorkspace();
  if (!workspace) redirect("/dashboard");
  return workspace.role === "owner" ? workspace : null;
}

const organizationName = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(120, "Keep the name under 120 characters.");

export async function createWorkspace(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formObject(formData);
  const existing = await getWorkspace();
  if (existing) redirect("/dashboard");

  const parsed = organizationName.safeParse(values.name);
  if (!parsed.success) return { fieldErrors: { name: parsed.error.issues.map((issue) => issue.message) }, values };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_organizations").insert({ name: parsed.data });
  if (error) return { ...problemOf(error), values };

  redirect("/dashboard");
}

export async function createEvent(_previous: FormState, formData: FormData): Promise<FormState> {
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = eventFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const event = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_events")
    .insert({
      org_id: workspace.org.id,
      name: event.name,
      slug: event.slug,
      type: event.type,
      timezone: event.timezone,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      venue_name: event.venueName,
      venue_address: event.venueAddress,
      theme: event.theme,
    })
    .select("id")
    .single();
  if (error) return { ...problemOf(error), values };

  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEvent(eventId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = eventFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  const event = parsed.data;

  // The address may change, and the page cached under the old one must go too.
  const before = await getEvent(eventId);

  const supabase = await createClient();
  // The event type is chosen once, when the event is created.
  const { data, error } = await supabase
    .from("a41_events")
    .update({
      name: event.name,
      slug: event.slug,
      timezone: event.timezone,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      venue_name: event.venueName,
      venue_address: event.venueAddress,
      theme: event.theme,
    })
    .eq("id", eventId)
    .select("id, slug");
  if (error) return { ...problemOf(error), values };
  if (data.length === 0) return { error: "That event no longer exists, or you cannot edit it.", values };

  // The public event page is cached for a minute; this makes the edit show at once.
  updateTag(publicEventTag(data[0].slug));
  if (before && before.slug !== data[0].slug) updateTag(publicEventTag(before.slug));
  refresh();
  return { saved: true };
}

const eventStatus = z.enum(["draft", "published", "archived"]);

/**
 * Bound to an event and a status, then used as a form action: `setEventStatus.bind(null, id, "published")`.
 * Server Actions are public endpoints, so the status is checked here and not trusted from the bind.
 */
export async function setEventStatus(eventId: string, status: string): Promise<FormState> {
  const parsedStatus = eventStatus.safeParse(status);
  if (!isUuid(eventId) || !parsedStatus.success) return { error: "That event no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { data, error } = await supabase.from("a41_events").update({ status: parsedStatus.data }).eq("id", eventId).select("id, slug");
  if (error) return problemOf(error);
  if (data.length === 0) return { error: "That event no longer exists, or you cannot edit it." };

  // The public event page is cached for a minute; this makes the new state show at once.
  updateTag(publicEventTag(data[0].slug));
  refresh();
  return { saved: true };
}

/** The columns a guest's details live in. */
const guestFields = (guest: GuestInput) => ({
  name: guest.name,
  email: guest.email,
  phone: guest.phone,
  tags: guest.tags,
  table_no: guest.tableNo,
});

const guestRow = (eventId: string, guest: GuestInput) => ({ event_id: eventId, ...guestFields(guest) });

export async function addGuest(eventId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = guestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_guests").insert(guestRow(eventId, parsed.data));
  if (error) return { ...problemOf(error), values };

  refresh();
  return { saved: true };
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isUuid(eventId) || !isUuid(guestId)) return { error: "That guest no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = guestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_guests")
    .update(guestFields(parsed.data))
    .eq("id", guestId)
    .eq("event_id", eventId)
    .select("id");
  if (error) return { ...problemOf(error), values };
  if (data.length === 0) return { error: "That guest no longer exists.", values };

  refresh();
  return { saved: true };
}

export async function deleteGuest(eventId: string, guestId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(guestId)) return { error: "That guest no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.from("a41_guests").delete().eq("id", guestId).eq("event_id", eventId);
  if (error) return problemOf(error);

  refresh();
  return {};
}

export type ImportResult = { ok: true; added: number; skipped: number } | { ok: false; error: string };

/**
 * Adds a batch of guests in one statement, so either all of them are added or
 * none. The browser has already checked the rows; they are checked again here
 * because nothing the browser sends can be trusted.
 */
export async function importGuests(eventId: string, rows: unknown): Promise<ImportResult> {
  if (!isUuid(eventId)) return { ok: false, error: "That event no longer exists." };
  const workspace = await ownerWorkspace();
  if (!workspace) return { ok: false, error: OWNER_ONLY };

  const parsed = z.array(guestSchema).max(MAX_IMPORT_ROWS, `Import up to ${MAX_IMPORT_ROWS} guests at a time.`).safeParse(rows);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Some rows could not be read. Check the file and try again." };
  }

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "That event no longer exists." };

  const { ready, duplicates } = dedupeGuests(parsed.data, await listGuestContacts(eventId));
  if (ready.length === 0) return { ok: true, added: 0, skipped: duplicates.length };

  const supabase = await createClient();
  const capacity = capacityOf(event, await countGuests(supabase, eventId));
  if (ready.length > capacity.remaining) {
    return {
      ok: false,
      error:
        capacity.remaining === 0
          ? "The guest list is full, so nobody can be added."
          : `Only ${capacity.remaining} more ${capacity.remaining === 1 ? "guest fits" : "guests fit"} on the list, but this import adds ${ready.length}. Nothing was imported.`,
    };
  }

  const { error } = await supabase.from("a41_guests").insert(ready.map((guest) => guestRow(eventId, guest)));
  if (error) {
    const failure = classifyDbError(error);
    // Someone else added the same people between the check and the insert.
    if (failure === "duplicate_email" || failure === "duplicate_phone") {
      return { ok: false, error: "Some of these guests were added a moment ago. Open the import again to see what is left." };
    }
    return { ok: false, error: describeFailure(failure, error).error ?? TRY_AGAIN };
  }

  refresh();
  return { ok: true, added: ready.length, skipped: duplicates.length };
}
