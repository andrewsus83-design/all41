/**
 * The fair-use limits of the photo wall (product spec, section 3.7). The
 * database enforces the same numbers; a test keeps the two equal.
 */
export const PHOTO_BUCKET = "a41_photos";

/** A photo is converted in the browser to stay under this. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const MAX_PHOTOS_PER_GUEST = 10;

/** Media is deleted this long after it was uploaded. */
export const PHOTO_RETENTION_DAYS = 30;

/** WebP where the browser can encode it, JPEG otherwise. */
export const PHOTO_MIME_TYPES = ["image/webp", "image/jpeg"] as const;
export type PhotoMimeType = (typeof PHOTO_MIME_TYPES)[number];

export type PhotoFormat = "webp" | "jpg";

export const FORMAT_MIME: Record<PhotoFormat, PhotoMimeType> = { webp: "image/webp", jpg: "image/jpeg" };

/** Uploads stay open this long after an event ends, for the after-party and late posters. */
export const UPLOAD_GRACE_HOURS = 12;
