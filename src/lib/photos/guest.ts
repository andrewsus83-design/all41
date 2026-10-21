import "server-only";

import { connection } from "next/server";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import { classifyPhotoError, type PhotoFailure } from "./errors";
import { PHOTO_BUCKET, type PhotoFormat } from "./limits";
import {
  parseAlbumRow,
  parseMyPhotoRow,
  parseOverviewRow,
  parseTicketRow,
  type AlbumPhoto,
  type MyPhoto,
  type PhotoOverview,
  type UploadTicket,
} from "./records";

// What a guest does with photos, through the public functions that check the
// invitation token themselves. The browser never gets more than a one-time
// upload path; it never sees the database.

export type Outcome<T> = { ok: true; value: T } | { ok: false; failure: PhotoFailure };

const failed = (error: { code?: string | null; message?: string | null }): Outcome<never> => {
  const failure = classifyPhotoError(error);
  // Only the code and message are logged: they never hold a token or a name.
  if (failure === "unknown") console.error("[a41] unexpected photo error", error.code, error.message);
  return { ok: false, failure };
};

/** A token is 64 hex characters today; the database decides, this only keeps junk out of the query. */
const tokenSchema = z.string().min(8).max(200);
const pathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/);

async function client() {
  // Everything here is work for one request: say so before the clock is read.
  await connection();
  return createAnonClient();
}

/** The camera page's view of the event and the guest. Null for a token that opens nothing. */
export async function getPhotoOverview(token: string): Promise<PhotoOverview | null> {
  if (!tokenSchema.safeParse(token).success) return null;
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_photo_overview", { p_token: token });
  if (error) throw new Error(`Could not load the photo page: ${error.message}`);
  return data?.[0] ? parseOverviewRow(data[0]) : null;
}

export async function listMyPhotos(token: string): Promise<MyPhoto[]> {
  if (!tokenSchema.safeParse(token).success) return [];
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_my_photos", { p_token: token });
  if (error) throw new Error(`Could not load your photos: ${error.message}`);
  return (data ?? []).map(parseMyPhotoRow);
}

export const ALBUM_PAGE_SIZE = 60;

export interface AlbumCursor {
  approvedAt: string;
  id: string;
}

/** One page of the shared album, newest first. Pass the last photo of the previous page to get the next. */
export async function listAlbum(token: string, after?: AlbumCursor): Promise<AlbumPhoto[]> {
  if (!tokenSchema.safeParse(token).success) return [];
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_album", {
    p_token: token,
    p_limit: ALBUM_PAGE_SIZE,
    ...(after ? { p_before: after.approvedAt, p_before_id: after.id } : {}),
  });
  if (error) throw new Error(`Could not load the album: ${error.message}`);
  return (data ?? []).map(parseAlbumRow);
}

/** Step 1 of an upload: asks for a one-time path. Pass consent=true when the guest has just agreed to the photo notice. */
export async function requestUpload(token: string, format: PhotoFormat, consent: boolean): Promise<Outcome<UploadTicket>> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, failure: "invitation_not_found" };
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_request_photo_upload", {
    p_token: token,
    p_format: format,
    p_consent: consent,
  });
  if (error) return failed(error);
  return { ok: true, value: parseTicketRow(data[0]) };
}

/** Step 3 of an upload: the file is in the bucket, make it a photo. Safe to call again after a lost answer. */
export async function commitPhoto(token: string, path: string): Promise<Outcome<MyPhoto>> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, failure: "invitation_not_found" };
  if (!pathSchema.safeParse(path).success) return { ok: false, failure: "upload_ticket_invalid" };
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_commit_photo", { p_token: token, p_path: path });
  if (error) return failed(error);
  return { ok: true, value: parseMyPhotoRow(data[0]) };
}

/**
 * Takes one of the guest's own photos down: hidden at once, then its file is
 * deleted (the storage policy allows that once the photo is marked removed).
 * If deleting the file fails the retention job removes it later.
 */
export async function removeMyPhoto(token: string, photoId: string): Promise<Outcome<{ removed: boolean }>> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, failure: "invitation_not_found" };
  if (!z.uuid().safeParse(photoId).success) return { ok: true, value: { removed: false } };
  const supabase = await client();
  const { data, error } = await supabase.rpc("a41_remove_my_photo", { p_token: token, p_photo_id: photoId });
  if (error) return failed(error);
  if (!data) return { ok: true, value: { removed: false } };

  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([data]);
  if (storageError) console.error("[a41] could not delete a removed photo's file", storageError.message);
  return { ok: true, value: { removed: true } };
}
