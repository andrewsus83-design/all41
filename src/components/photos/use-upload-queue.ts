"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { commitPhotoAction, requestUploadAction } from "@/app/i/[token]/photos/actions";
import type { PhotoFormat } from "@/lib/photos/limits";
import type { MyPhoto } from "@/lib/photos/records";
import { uploadToTicket } from "@/lib/photos/upload-client";

/** Where an upload is: waiting its turn, getting a path, sending the file, or saving it. */
export type UploadState = "waiting" | "ticket" | "uploading" | "saving" | "failed";

export interface UploadItem {
  key: string;
  previewUrl: string;
  state: UploadState;
  /** Which try of the current step this is, starting at 1. */
  attempt: number;
  message?: string;
  /** Trying again cannot help (the limit is reached, the wall closed). */
  final?: boolean;
}

interface Entry {
  blob: Blob;
  format: PhotoFormat;
  path?: string;
  /** When the one-time path stops working, in ms since 1970. */
  expiresAt?: number;
}

/** Waits between tries of one step. Bad Wi-Fi in a ballroom usually answers on the second or third. */
const RETRY_DELAYS = [800, 2500];
const NO_CONNECTION = "No connection. Check your Wi-Fi and try again.";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends photos one at a time: ask for a path, upload the file to it, tell the
 * database. Each step is tried again on a network failure, the second step
 * starts over with a new path if the first ran out, and a failed photo waits
 * in the list with a Try again button, so a guest never loses a picture to a
 * bad signal.
 */
export function useUploadQueue({
  token,
  consent,
  onSaved,
}: {
  token: string;
  /** True once the guest ticked the photo notice. */
  consent: boolean;
  onSaved: (photo: MyPhoto) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const entries = useRef(new Map<string, Entry>());
  const chain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef({ token, consent, onSaved });
  useEffect(() => {
    latest.current = { token, consent, onSaved };
  });

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }, []);

  const drop = useCallback((key: string) => {
    entries.current.delete(key);
    setItems((list) => {
      const gone = list.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((item) => item.key !== key);
    });
  }, []);

  const run = useCallback(
    async (key: string) => {
      const entry = entries.current.get(key);
      if (!entry) return;
      const fail = (message: string, final = false) => patch(key, { state: "failed", message, final });

      // The second round only happens when Storage refused the first path, which means it ran out.
      for (let round = 0; round < 2; round++) {
        // 1. a one-time path
        if (!entry.path || (entry.expiresAt ?? 0) < Date.now() + 30_000) {
          let ticket;
          for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
            patch(key, { state: "ticket", attempt: attempt + 1, message: undefined });
            try {
              ticket = await requestUploadAction(latest.current.token, entry.format, latest.current.consent);
              break;
            } catch {
              if (attempt === RETRY_DELAYS.length) return fail(NO_CONNECTION);
              await sleep(RETRY_DELAYS[attempt]);
            }
          }
          if (!ticket) return fail(NO_CONNECTION);
          if (!ticket.ok) return fail(ticket.message, ticket.final);
          entry.path = ticket.path;
          entry.expiresAt = new Date(ticket.expiresAt).getTime();
        }

        // 2. the file, straight to Storage
        let outcome: Awaited<ReturnType<typeof uploadToTicket>> = "retry";
        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
          patch(key, { state: "uploading", attempt: attempt + 1, message: undefined });
          outcome = await uploadToTicket(entry.path, entry.blob, entry.format);
          if (outcome !== "retry") break;
          if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
        }
        if (outcome === "retry") return fail(NO_CONNECTION);
        if (outcome === "refused") {
          entry.path = undefined;
          if (round === 0) continue;
          return fail("The upload was not accepted. Please take the photo again.");
        }

        // 3. tell the database; repeating this is safe
        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
          patch(key, { state: "saving", attempt: attempt + 1, message: undefined });
          try {
            const saved = await commitPhotoAction(latest.current.token, entry.path);
            if (saved.ok) {
              latest.current.onSaved(saved.photo);
              drop(key);
              return;
            }
            return fail(saved.message, saved.final);
          } catch {
            if (attempt === RETRY_DELAYS.length) return fail(NO_CONNECTION);
            await sleep(RETRY_DELAYS[attempt]);
          }
        }
        return;
      }
    },
    [drop, patch],
  );

  const schedule = useCallback(
    (key: string) => {
      chain.current = chain.current.then(() => run(key)).catch(() => undefined);
    },
    [run],
  );

  const enqueue = useCallback(
    (blob: Blob, format: PhotoFormat) => {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      entries.current.set(key, { blob, format });
      setItems((list) => [...list, { key, previewUrl: URL.createObjectURL(blob), state: "waiting", attempt: 1 }]);
      schedule(key);
    },
    [schedule],
  );

  const retry = useCallback(
    (key: string) => {
      patch(key, { state: "waiting", attempt: 1, message: undefined });
      schedule(key);
    },
    [patch, schedule],
  );

  // Leaving the page while a photo is on its way would lose it.
  const busy = items.some((item) => item.state !== "failed");
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  useEffect(() => {
    const current = entries.current;
    return () => {
      current.clear();
    };
  }, []);

  return { items, enqueue, retry, discard: drop };
}
