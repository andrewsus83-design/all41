import { z } from "zod";

// The check-in functions answer with jsonb, which reaches the app as plain JSON.
// These schemas read it once, at the edge, into the camelCase shapes the screens use.

const guestCard = z
  .object({
    id: z.string(),
    name: z.string(),
    table_no: z.string().nullable(),
    tags: z.array(z.string()),
    party_size: z.number().int().nullable(),
    response: z.enum(["attending", "declined"]).nullable(),
  })
  .transform((guest) => ({
    id: guest.id,
    name: guest.name,
    tableNo: guest.table_no,
    tags: guest.tags,
    partySize: guest.party_size,
    response: guest.response,
  }));

export type GuestCard = z.output<typeof guestCard>;

const checkinResult = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("checked_in"), checked_in_at: z.string(), guest: guestCard }),
  z.object({ outcome: z.literal("already_checked_in"), checked_in_at: z.string(), guest: guestCard }),
  z.object({ outcome: z.literal("other_event"), event_name: z.string().nullable() }),
  z.object({ outcome: z.literal("unknown") }),
]);

/** What the door shows after a scan or a tap. */
export type CheckinResult =
  | { outcome: "checked_in" | "already_checked_in"; checkedInAt: string; guest: GuestCard }
  | { outcome: "other_event"; eventName: string | null }
  | { outcome: "unknown" };

export function parseCheckinResult(value: unknown): CheckinResult {
  const parsed = checkinResult.parse(value);
  switch (parsed.outcome) {
    case "checked_in":
    case "already_checked_in":
      return { outcome: parsed.outcome, checkedInAt: parsed.checked_in_at, guest: parsed.guest };
    case "other_event":
      return { outcome: "other_event", eventName: parsed.event_name };
    case "unknown":
      return { outcome: "unknown" };
  }
}

const stats = z
  .object({
    total_guests: z.number().int(),
    checked_in: z.number().int(),
    attending: z.number().int(),
    attending_checked_in: z.number().int(),
    recent: z.array(
      z.object({ guest_id: z.string(), name: z.string(), table_no: z.string().nullable(), checked_in_at: z.string() }),
    ),
  })
  .transform((row) => ({
    totalGuests: row.total_guests,
    checkedIn: row.checked_in,
    attending: row.attending,
    attendingCheckedIn: row.attending_checked_in,
    recent: row.recent.map((entry) => ({
      guestId: entry.guest_id,
      name: entry.name,
      tableNo: entry.table_no,
      checkedInAt: entry.checked_in_at,
    })),
  }));

/** The live numbers of the door: serializable, so it goes to the browser as it is. */
export type CheckinStats = z.output<typeof stats>;

export const parseCheckinStats = (value: unknown): CheckinStats => stats.parse(value);

const searchResults = z.array(
  z
    .object({
      id: z.string(),
      name: z.string(),
      table_no: z.string().nullable(),
      tags: z.array(z.string()),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      checked_in_at: z.string().nullable(),
      party_size: z.number().int().nullable(),
      response: z.enum(["attending", "declined"]).nullable(),
    })
    .transform((row) => ({
      id: row.id,
      name: row.name,
      tableNo: row.table_no,
      tags: row.tags,
      email: row.email,
      phone: row.phone,
      checkedInAt: row.checked_in_at,
      partySize: row.party_size,
      response: row.response,
    })),
);

export type SearchHit = z.output<typeof searchResults>[number];

export const parseSearchResults = (value: unknown): SearchHit[] => searchResults.parse(value);
