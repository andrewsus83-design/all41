import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  MODERATION_COLUMNS,
  PHOTO_SETTINGS_COLUMNS,
  parseModerationRow,
  parseSettingsRow,
  parseStatsRow,
  type ModerationPhoto,
  type PhotoSettings,
  type PhotoStats,
  type PhotoStatus,
} from "./records";

// What the team sees of an event's photos. All of it runs as the signed-in
// person, so row level security decides what exists for them.

export const MODERATION_PAGE_SIZE = 48;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

export async function getPhotoSettings(eventId: string): Promise<PhotoSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_photo_settings")
    .select(PHOTO_SETTINGS_COLUMNS)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) fail("the photo settings", error);
  return data ? parseSettingsRow(data) : null;
}

export async function getPhotoStats(eventId: string): Promise<PhotoStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_photo_stats", { p_event_id: eventId });
  if (error) fail("the photo counts", error);
  return parseStatsRow(data?.[0] ?? {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    removed_count: 0,
    stored_bytes: 0,
    consent_count: 0,
  });
}

/** One page of an event's photos with a given status, newest first. */
export async function listEventPhotos(
  eventId: string,
  status: Exclude<PhotoStatus, "removed">,
  page = 1,
): Promise<{ photos: ModerationPhoto[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * MODERATION_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("a41_photos")
    .select(MODERATION_COLUMNS, { count: "exact" })
    .eq("event_id", eventId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + MODERATION_PAGE_SIZE - 1);
  // PostgREST refuses a page that starts past the last row.
  if (error?.code === "PGRST103") return { photos: [], total: count ?? 0 };
  if (error) fail("the photos", error);
  return { photos: (data ?? []).map(parseModerationRow), total: count ?? 0 };
}
