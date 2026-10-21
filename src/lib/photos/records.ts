import { z } from "zod";
import { parseTheme } from "@/lib/events/theme";

// What the database functions and tables of the photo wall answer with, as the
// app reads it. PostgREST sends JSON, so timestamps arrive as strings.

export const PHOTO_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

export const MODERATION_MODES = ["auto", "manual"] as const;
export type ModerationMode = (typeof MODERATION_MODES)[number];

const overviewRow = z
  .object({
    guest_name: z.string(),
    event_name: z.string(),
    event_slug: z.string(),
    theme: z.unknown(),
    timezone: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    photos_enabled: z.boolean(),
    uploads_open: z.boolean(),
    moderation: z.enum(MODERATION_MODES),
    consented_at: z.string().nullable(),
    photos_used: z.number().int(),
    photo_quota: z.number().int(),
  })
  .transform((row) => ({
    guestName: row.guest_name,
    eventName: row.event_name,
    eventSlug: row.event_slug,
    theme: parseTheme(row.theme),
    timezone: row.timezone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    photosEnabled: row.photos_enabled,
    uploadsOpen: row.uploads_open,
    moderation: row.moderation,
    consentedAt: row.consented_at,
    photosUsed: row.photos_used,
    photoQuota: row.photo_quota,
  }));

export type PhotoOverview = z.output<typeof overviewRow>;
export const parseOverviewRow = (row: unknown): PhotoOverview => overviewRow.parse(row);

const ticketRow = z
  .object({ upload_path: z.string(), ticket_expires_at: z.string(), photos_left: z.number().int() })
  .transform((row) => ({ path: row.upload_path, expiresAt: row.ticket_expires_at, photosLeft: row.photos_left }));

export type UploadTicket = z.output<typeof ticketRow>;
export const parseTicketRow = (row: unknown): UploadTicket => ticketRow.parse(row);

const myPhotoRow = z
  .object({
    photo_id: z.string(),
    photo_status: z.enum(PHOTO_STATUSES),
    storage_path: z.string(),
    created_at: z.string(),
  })
  .transform((row) => ({ id: row.photo_id, status: row.photo_status, path: row.storage_path, createdAt: row.created_at }));

/** A photo a guest took: also what committing an upload answers with. */
export type MyPhoto = z.output<typeof myPhotoRow>;
export const parseMyPhotoRow = (row: unknown): MyPhoto => myPhotoRow.parse(row);

const albumRow = z
  .object({
    photo_id: z.string(),
    storage_path: z.string(),
    approved_at: z.string(),
    is_mine: z.boolean(),
  })
  .transform((row) => ({ id: row.photo_id, path: row.storage_path, approvedAt: row.approved_at, isMine: row.is_mine }));

export type AlbumPhoto = z.output<typeof albumRow>;
export const parseAlbumRow = (row: unknown): AlbumPhoto => albumRow.parse(row);

const wallFeed = z
  .object({
    event: z.object({ name: z.string(), slug: z.string(), theme: z.unknown(), timezone: z.string() }),
    enabled: z.boolean(),
    total: z.number().int(),
    photos: z.array(z.object({ id: z.string(), storage_path: z.string(), approved_at: z.string() })),
  })
  .transform((feed) => ({
    event: { name: feed.event.name, slug: feed.event.slug, theme: parseTheme(feed.event.theme), timezone: feed.event.timezone },
    enabled: feed.enabled,
    total: feed.total,
    photos: feed.photos.map((photo) => ({ id: photo.id, path: photo.storage_path, approvedAt: photo.approved_at })),
  }));

/** The big-screen wall: the event's look and its newest approved photos. */
export type WallFeed = z.output<typeof wallFeed>;
export const parseWallFeed = (feed: unknown): WallFeed => wallFeed.parse(feed);

const settingsRow = z
  .object({ enabled: z.boolean(), moderation: z.enum(MODERATION_MODES), wall_key: z.string() })
  .transform((row) => ({ enabled: row.enabled, moderation: row.moderation, wallKey: row.wall_key }));

export const PHOTO_SETTINGS_COLUMNS = "enabled, moderation, wall_key";
export type PhotoSettings = z.output<typeof settingsRow>;
export const parseSettingsRow = (row: unknown): PhotoSettings => settingsRow.parse(row);

const statsRow = z
  .object({
    pending_count: z.number().int(),
    approved_count: z.number().int(),
    rejected_count: z.number().int(),
    removed_count: z.number().int(),
    stored_bytes: z.number(),
    consent_count: z.number().int(),
  })
  .transform((row) => ({
    pending: row.pending_count,
    approved: row.approved_count,
    rejected: row.rejected_count,
    removed: row.removed_count,
    storedBytes: row.stored_bytes,
    consents: row.consent_count,
  }));

export type PhotoStats = z.output<typeof statsRow>;
export const parseStatsRow = (row: unknown): PhotoStats => statsRow.parse(row);

export const MODERATION_COLUMNS = "id, storage_path, status, bytes, created_at, approved_at, a41_guests(name)";

const moderationRow = z
  .object({
    id: z.string(),
    storage_path: z.string(),
    status: z.enum(PHOTO_STATUSES),
    bytes: z.number().int(),
    created_at: z.string(),
    approved_at: z.string().nullable(),
    a41_guests: z.object({ name: z.string() }).nullable(),
  })
  .transform((row) => ({
    id: row.id,
    path: row.storage_path,
    status: row.status,
    bytes: row.bytes,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    guestName: row.a41_guests?.name ?? "A guest",
  }));

/** A photo as the host sees it when moderating. */
export type ModerationPhoto = z.output<typeof moderationRow>;
export const parseModerationRow = (row: unknown): ModerationPhoto => moderationRow.parse(row);
