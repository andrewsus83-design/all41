"use server";

import { z } from "zod";
import { PHOTO_FAILURE_MESSAGES, FINAL_FAILURES, type PhotoFailure } from "@/lib/photos/errors";
import { ALBUM_PAGE_SIZE, commitPhoto, listAlbum, removeMyPhoto, requestUpload, type AlbumCursor } from "@/lib/photos/guest";
import type { AlbumPhoto, MyPhoto } from "@/lib/photos/records";

// Guests are not signed in: every action here passes the invitation token on to
// database functions that check it themselves. What the browser gets back is a
// one-time upload path and the guest's own photos, never anything else.

export interface Refusal {
  ok: false;
  failure: PhotoFailure;
  message: string;
  /** True when asking again cannot help. */
  final: boolean;
}

const refusal = (failure: PhotoFailure): Refusal => ({
  ok: false,
  failure,
  message: PHOTO_FAILURE_MESSAGES[failure],
  final: FINAL_FAILURES.has(failure),
});

const formatSchema = z.enum(["webp", "jpg"]);

export type TicketResult = { ok: true; path: string; expiresAt: string; photosLeft: number } | Refusal;

/** Asks for the path a photo may be uploaded to. `consent` is true once the guest ticked the photo notice. */
export async function requestUploadAction(token: string, format: string, consent: boolean): Promise<TicketResult> {
  const parsed = formatSchema.safeParse(format);
  if (!parsed.success) return refusal("invalid_photo_format");
  const result = await requestUpload(token, parsed.data, consent === true);
  if (!result.ok) return refusal(result.failure);
  return { ok: true, path: result.value.path, expiresAt: result.value.expiresAt, photosLeft: result.value.photosLeft };
}

export type CommitResult = { ok: true; photo: MyPhoto } | Refusal;

/** Tells the database the file is uploaded. Safe to repeat. */
export async function commitPhotoAction(token: string, path: string): Promise<CommitResult> {
  const result = await commitPhoto(token, path);
  if (!result.ok) return refusal(result.failure);
  return { ok: true, photo: result.value };
}

export type RemoveResult = { ok: true } | Refusal;

export async function removePhotoAction(token: string, photoId: string): Promise<RemoveResult> {
  const result = await removeMyPhoto(token, photoId);
  if (!result.ok) return refusal(result.failure);
  return { ok: true };
}

const cursorSchema = z.object({ approvedAt: z.string().min(10).max(40), id: z.uuid() });

export interface AlbumPage {
  photos: AlbumPhoto[];
  hasMore: boolean;
}

/** The next page of the shared album, after the last photo the browser already has. */
export async function loadAlbumPageAction(token: string, after: AlbumCursor): Promise<AlbumPage> {
  const cursor = cursorSchema.safeParse(after);
  if (!cursor.success) return { photos: [], hasMore: false };
  const photos = await listAlbum(token, cursor.data);
  return { photos, hasMore: photos.length === ALBUM_PAGE_SIZE };
}
