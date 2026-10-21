import type { DbError } from "@/lib/db-errors";
import { MAX_PHOTOS_PER_GUEST, UPLOAD_GRACE_HOURS } from "./limits";

/**
 * The refusals a guest can run into, named after the rule the database raises.
 * A test makes the real database raise each one, so a renamed rule fails there.
 */
export type PhotoFailure =
  | "invitation_not_found"
  | "photos_disabled"
  | "photos_closed"
  | "consent_required"
  | "photo_limit_reached"
  | "upload_ticket_invalid"
  | "upload_missing"
  | "photo_too_large"
  | "invalid_photo_type"
  | "invalid_photo_format"
  | "forbidden"
  | "unknown";

const RULES = new Set<string>([
  "invitation_not_found",
  "photos_disabled",
  "photos_closed",
  "consent_required",
  "photo_limit_reached",
  "upload_ticket_invalid",
  "upload_missing",
  "photo_too_large",
  "invalid_photo_type",
  "invalid_photo_format",
  "forbidden",
]);

export function classifyPhotoError(error: DbError): PhotoFailure {
  const message = error.message ?? "";
  return RULES.has(message) ? (message as PhotoFailure) : "unknown";
}

/** What to tell the person, in plain words. */
export const PHOTO_FAILURE_MESSAGES: Record<PhotoFailure, string> = {
  invitation_not_found: "This link does not work. Open the invitation link you received again.",
  photos_disabled: "The photo wall is not open for this event.",
  photos_closed: `Photos can no longer be added: uploads closed ${UPLOAD_GRACE_HOURS} hours after the event ended.`,
  consent_required: "Please agree to the photo notice first.",
  photo_limit_reached: `You have used all ${MAX_PHOTOS_PER_GUEST} photos. Remove one to add another.`,
  upload_ticket_invalid: "That upload took too long. Please try the photo again.",
  upload_missing: "The photo did not arrive. Please try again.",
  photo_too_large: "That photo is too large. Please take it again.",
  invalid_photo_type: "That file is not a photo we can use.",
  invalid_photo_format: "That file is not a photo we can use.",
  forbidden: "Only an owner of the organization can do that.",
  unknown: "Something went wrong on our side. Please try again.",
};

/** Failures that retrying the same request cannot fix. */
export const FINAL_FAILURES: ReadonlySet<PhotoFailure> = new Set([
  "invitation_not_found",
  "photos_disabled",
  "photos_closed",
  "consent_required",
  "photo_limit_reached",
  "invalid_photo_type",
  "invalid_photo_format",
]);
