"use client";

import { useSyncExternalStore } from "react";

/** A scan the phone could not send. It is sent again when the connection is back. */
export interface Queued {
  text: string;
  at: string;
  attempts: number;
}

const EMPTY: Queued[] = [];
const memory = new Map<string, Queued[]>();
const listeners = new Set<() => void>();

const storageKey = (eventId: string) => `a41-checkin-queue:${eventId}`;

function read(eventId: string): Queued[] {
  try {
    const raw = window.localStorage.getItem(storageKey(eventId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter((item): item is Queued => typeof item?.text === "string" && typeof item?.at === "string");
    return items.slice(0, 200).map((item) => ({ text: item.text, at: item.at, attempts: Number(item.attempts) || 1 }));
  } catch {
    return EMPTY;
  }
}

/** The saved scans of an event. The same array is returned until they change. */
export function getQueue(eventId: string): Queued[] {
  let queue = memory.get(eventId);
  if (!queue) {
    queue = read(eventId);
    memory.set(eventId, queue);
  }
  return queue;
}

export function setQueue(eventId: string, queue: Queued[]) {
  memory.set(eventId, queue.length === 0 ? EMPTY : queue);
  try {
    if (queue.length === 0) window.localStorage.removeItem(storageKey(eventId));
    else window.localStorage.setItem(storageKey(eventId), JSON.stringify(queue));
  } catch {
    // Storage can be blocked; the queue then lives for this visit only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Saved scans, kept in the browser so a reload of the page does not lose them. */
export function useOfflineQueue(eventId: string): Queued[] {
  return useSyncExternalStore(
    subscribe,
    () => getQueue(eventId),
    () => EMPTY,
  );
}
