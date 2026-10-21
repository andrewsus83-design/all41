import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";
import { FORMAT_MIME, PHOTO_BUCKET, type PhotoFormat } from "./limits";

// Browser side of an upload. The photo goes straight from the phone to Storage
// with the publishable key, and only to the one-time path the server issued; the
// database refuses any other path (see the policy on storage.objects).

let client: SupabaseClient | undefined;

function storageClient(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = supabaseEnv();
    // No session: a guest is not signed in, and nothing is stored in the browser.
    client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

/**
 * ok: the file is stored. refused: the ticket does not allow this (it ran out,
 * the file is too big), so ask for a new one. retry: the network or Storage
 * failed, the same request may work in a moment.
 */
export type UploadOutcome = "ok" | "refused" | "retry";

interface StorageFailure {
  status?: number;
  statusCode?: string | number;
  message?: string;
}

export async function uploadToTicket(path: string, blob: Blob, format: PhotoFormat): Promise<UploadOutcome> {
  try {
    const { error } = await storageClient()
      .storage.from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: FORMAT_MIME[format], cacheControl: "2592000", upsert: false });
    if (!error) return "ok";

    const failure = error as StorageFailure;
    // The path already holds a file: an earlier try of this upload got through.
    if (failure.status === 409 || String(failure.statusCode) === "409") return "ok";
    if (failure.status === undefined) return "retry";
    if (failure.status >= 500 || failure.status === 429 || failure.status === 408) return "retry";
    return "refused";
  } catch {
    return "retry";
  }
}
