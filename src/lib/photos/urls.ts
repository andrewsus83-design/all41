import { supabaseEnv } from "@/lib/env";
import { PHOTO_BUCKET } from "./limits";

/** The address of a stored photo. The bucket is public and the path cannot be guessed. */
export function photoUrl(path: string, options: { download?: string } = {}): string {
  const base = `${supabaseEnv().url.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return options.download ? `${base}?download=${encodeURIComponent(options.download)}` : base;
}

/** A file name for a downloaded photo, such as "annual-gala-2026-10-21.webp". */
export function photoFileName(eventSlug: string, createdAt: string, path: string): string {
  const [name = "", extension = "webp"] = (path.split("/").pop() ?? "").split(".");
  return `${eventSlug}-${createdAt.slice(0, 10)}-${name.slice(0, 8)}.${extension}`;
}
