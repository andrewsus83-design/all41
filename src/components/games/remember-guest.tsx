"use client";

import { useEffect } from "react";

const keyFor = (playKey: string) => `a41.guest.${playKey}`;

/** Remembers which invitation this phone uses for an event's games, so a game link or QR can find it again. */
export function rememberGuest(playKey: string, token: string) {
  try {
    window.localStorage.setItem(keyFor(playKey), token);
  } catch {
    // private mode or blocked storage: the game still works, only the shortcut is lost
  }
}

export function recallGuest(playKey: string): string | null {
  try {
    const token = window.localStorage.getItem(keyFor(playKey));
    return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Put this on any guest page that knows both the invitation token and the event's play key:
 * it saves them in the browser. The invitation page can use it too.
 */
export function RememberGuest({ playKey, token }: { playKey: string; token: string }) {
  useEffect(() => rememberGuest(playKey, token), [playKey, token]);
  return null;
}
