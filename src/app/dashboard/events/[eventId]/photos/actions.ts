"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getWorkspace } from "@/lib/events/queries";
import type { FormState } from "@/lib/forms";
import { formObject } from "@/lib/forms";
import { PHOTO_BUCKET } from "@/lib/photos/limits";
import { MODERATION_MODES } from "@/lib/photos/records";
import { createClient } from "@/lib/supabase/server";

// Moderation is the owner's job. Each action checks who is asking itself, and
// row level security checks the same token again in the database: a photo of
// another organization's event simply is not there for this person.

const OWNER_ONLY = "Only an owner of the organization can do that.";
const TRY_AGAIN = "Something went wrong on our side. Please try again.";
const GONE = "That photo no longer exists.";

const isUuid = (value: string) => z.uuid().safeParse(value).success;

async function isOwner() {
  return (await getWorkspace())?.role === "owner";
}

const settingsSchema = z.object({
  moderation: z.enum(MODERATION_MODES, { error: "Choose how photos reach the wall." }),
});

export async function savePhotoSettings(eventId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  if (!(await isOwner())) return { error: OWNER_ONLY };

  const values = formObject(formData);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? TRY_AGAIN, values };
  // A checkbox is only sent when it is ticked.
  const enabled = values.enabled === "on";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_photo_settings")
    .update({ enabled, moderation: parsed.data.moderation })
    .eq("event_id", eventId)
    .select("event_id");
  if (error) {
    console.error("[a41] could not save the photo settings", error.code, error.message);
    return { error: TRY_AGAIN, values };
  }
  if (data.length === 0) return { error: "That event no longer exists, or you cannot change it.", values };

  refresh();
  return { saved: true };
}

/** Replaces the wall key, so the old wall link stops working. */
export async function regenerateWallKey(eventId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  if (!(await isOwner())) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { error } = await supabase.rpc("a41_regenerate_wall_key", { p_event_id: eventId });
  if (error) {
    if (error.code === "42501") return { error: OWNER_ONLY };
    console.error("[a41] could not replace the wall key", error.code, error.message);
    return { error: TRY_AGAIN };
  }

  refresh();
  return {};
}

export type ModerationStatus = "approved" | "rejected";

/** Puts a photo on the wall or takes it off. Taking it off keeps the photo, only hidden. */
export async function setPhotoStatus(eventId: string, photoId: string, status: ModerationStatus): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(photoId)) return { error: GONE };
  if (status !== "approved" && status !== "rejected") return { error: TRY_AGAIN };
  if (!(await isOwner())) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_photos")
    .update({ status })
    .eq("id", photoId)
    .eq("event_id", eventId)
    .neq("status", "removed")
    .select("id");
  if (error) {
    console.error("[a41] could not change a photo", error.code, error.message);
    return { error: TRY_AGAIN };
  }
  if (data.length === 0) return { error: GONE };

  refresh();
  return {};
}

/** Approves everything that is waiting, for a host who trusts the room. */
export async function approveAllPending(eventId: string): Promise<{ error?: string; approved?: number }> {
  if (!isUuid(eventId)) return { error: "That event no longer exists." };
  if (!(await isOwner())) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("a41_photos")
    .update({ status: "approved" })
    .eq("event_id", eventId)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("[a41] could not approve the waiting photos", error.code, error.message);
    return { error: TRY_AGAIN };
  }

  refresh();
  return { approved: data.length };
}

/** Deletes a photo for good: the file first, then the row, so a failure never leaves a visible file without a row. */
export async function deletePhoto(eventId: string, photoId: string): Promise<{ error?: string }> {
  if (!isUuid(eventId) || !isUuid(photoId)) return { error: GONE };
  if (!(await isOwner())) return { error: OWNER_ONLY };

  const supabase = await createClient();
  const { data: photo, error: readError } = await supabase
    .from("a41_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError) {
    console.error("[a41] could not read a photo", readError.code, readError.message);
    return { error: TRY_AGAIN };
  }
  if (!photo) return { error: GONE };

  const { error: fileError } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  if (fileError) {
    console.error("[a41] could not delete a photo file", fileError.message);
    return { error: TRY_AGAIN };
  }

  const { error } = await supabase.from("a41_photos").delete().eq("id", photoId).eq("event_id", eventId);
  if (error) {
    console.error("[a41] could not delete a photo", error.code, error.message);
    return { error: TRY_AGAIN };
  }

  refresh();
  return {};
}
