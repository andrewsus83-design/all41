import { z } from "zod";
import { EVENT_TYPES } from "@/lib/events/schema";
import { parseTheme } from "@/lib/events/theme";

// What the public database functions (a41_public_event, a41_open_invitation,
// a41_submit_rsvp) return. They are JSON, so they are read with zod rather
// than trusted, and turned into the camelCase shapes the pages use.

export const RSVP_RESPONSES = ["attending", "declined"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

/** The most people one invitation can bring, the guest included. Equal to the database's check. */
export const MAX_PARTY_SIZE = 10;
export const MEAL_PREFERENCE_MAX = 100;
export const RSVP_MESSAGE_MAX = 500;

const publicEventRow = z
  .object({
    slug: z.string(),
    name: z.string(),
    type: z.enum(EVENT_TYPES),
    timezone: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    venue_name: z.string().nullable(),
    venue_address: z.string().nullable(),
    theme: z.unknown(),
  })
  .transform((row) => ({
    slug: row.slug,
    name: row.name,
    type: row.type,
    timezone: row.timezone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    theme: parseTheme(row.theme),
  }));

/** An event as a guest may see it: no organization, no billing, no internal id. */
export type PublicEvent = z.output<typeof publicEventRow>;

export const parsePublicEvent = (value: unknown): PublicEvent | null => (value == null ? null : publicEventRow.parse(value));

const rsvpRow = z
  .object({
    response: z.enum(RSVP_RESPONSES),
    party_size: z.number().int(),
    meal_preference: z.string().nullable(),
    message: z.string().nullable(),
    responded_at: z.string(),
  })
  .transform((row) => ({
    response: row.response,
    partySize: row.party_size,
    mealPreference: row.meal_preference,
    message: row.message,
    respondedAt: row.responded_at,
  }));

export type RsvpRecord = z.output<typeof rsvpRow>;

const invitationRow = z
  .object({
    guest: z.object({ name: z.string(), table_no: z.string().nullable() }),
    event: publicEventRow,
    rsvp: rsvpRow.nullable(),
    rsvp_open: z.boolean(),
    checked_in_at: z.string().nullable(),
  })
  .transform((row) => ({
    guestName: row.guest.name,
    tableNo: row.guest.table_no,
    event: row.event,
    rsvp: row.rsvp,
    rsvpOpen: row.rsvp_open,
    checkedInAt: row.checked_in_at,
  }));

/** A personal invitation: the guest, their event and the answer they gave so far. */
export type Invitation = z.output<typeof invitationRow>;

export const parseInvitation = (value: unknown): Invitation | null => (value == null ? null : invitationRow.parse(value));

const RSVP_FIELDS = ["response", "party_size", "meal_preference", "message"] as const;

const submitRow = z.union([
  z.object({ ok: z.literal(true), rsvp: rsvpRow }),
  z.object({ ok: z.literal(false), reason: z.enum(["not_found", "closed"]) }),
  z.object({ ok: z.literal(false), reason: z.literal("invalid"), field: z.enum(RSVP_FIELDS) }),
]);

export type SubmitRsvpResult = z.output<typeof submitRow>;

export const parseSubmitResult = (value: unknown): SubmitRsvpResult => submitRow.parse(value);
