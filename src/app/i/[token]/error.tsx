"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the invitation could not be loaded or sent, which at a crowded venue is mostly the network. */
export default function InvitationError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold" aria-hidden="true">
        <WifiOff className="size-8" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold">That did not go through</h1>
      <p className="mt-3 max-w-sm text-muted">
        The connection may be weak, or something went wrong on our side. Please try again in a moment.
      </p>
      <Button size="lg" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
