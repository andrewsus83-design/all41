"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { buttonStyles } from "@/components/ui/button";
import { recallGuest } from "./remember-guest";

/**
 * The landing of a game QR that is not personal: finds the invitation this phone opened before and
 * sends the guest on to their own page. A phone that never opened its invitation gets told where to start.
 */
export function OpenMyGame({ playKey, to, label, code }: { playKey: string; to: "play" | "hunt"; label: string; code?: string }) {
  // undefined while the server renders (it cannot see this phone's storage), then the token or null
  const token = useSyncExternalStore(
    () => () => {},
    () => recallGuest(playKey),
    () => undefined,
  );

  useEffect(() => {
    if (token) window.location.replace(`/i/${token}/${to}${code ? `?code=${encodeURIComponent(code)}` : ""}`);
  }, [token, to, code]);

  if (token !== null) {
    return <p className="text-muted">Finding your invitation…</p>;
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Open your invitation first</h1>
      <p className="text-muted">
        {label} is played with your personal invitation link, the one the host sent you by WhatsApp or email. Open that link on this phone, then tap the game
        {to === "hunt" ? " and scan the poster again" : ""}.
      </p>
      <Link href="/" className={buttonStyles({ variant: "secondary" })}>
        Go to all41
      </Link>
    </div>
  );
}
