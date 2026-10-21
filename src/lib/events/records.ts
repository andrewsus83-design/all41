import { z } from "zod";
import { PACKAGE_TIERS } from "@/lib/pricing";
import { EVENT_TYPES } from "./schema";
import { parseTheme } from "./theme";

/** Columns the app reads. Billing columns are readable, only writing them is server-only. */
export const EVENT_COLUMNS =
  "id, org_id, name, slug, type, timezone, starts_at, ends_at, venue_name, venue_address, theme, package, extra_guests, status";

export const EVENT_STATUSES = ["draft", "published", "archived"] as const;

const eventRow = z
  .object({
    id: z.string(),
    org_id: z.string(),
    name: z.string(),
    slug: z.string(),
    type: z.enum(EVENT_TYPES),
    timezone: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    venue_name: z.string().nullable(),
    venue_address: z.string().nullable(),
    theme: z.unknown(),
    package: z.enum(PACKAGE_TIERS),
    extra_guests: z.number().int(),
    status: z.enum(EVENT_STATUSES),
  })
  .transform((row) => ({
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    timezone: row.timezone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    theme: parseTheme(row.theme),
    package: row.package,
    extraGuests: row.extra_guests,
    status: row.status,
  }));

export type EventRecord = z.output<typeof eventRow>;

export const parseEventRow = (row: unknown): EventRecord => eventRow.parse(row);

export const GUEST_COLUMNS = "id, name, email, phone, tags, table_no, status, created_at";

export const GUEST_STATUSES = ["invited", "sent", "opened", "rsvp", "checked_in"] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  invited: "Invited",
  sent: "Sent",
  opened: "Opened",
  rsvp: "Responded",
  checked_in: "Checked in",
};

const guestRow = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    tags: z.array(z.string()),
    table_no: z.string().nullable(),
    status: z.enum(GUEST_STATUSES),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    tags: row.tags,
    tableNo: row.table_no,
    status: row.status,
    createdAt: row.created_at,
  }));

export type GuestRecord = z.output<typeof guestRow>;

export const parseGuestRow = (row: unknown): GuestRecord => guestRow.parse(row);
